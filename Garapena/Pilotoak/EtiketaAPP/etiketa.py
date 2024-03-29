from flask import Flask, render_template, redirect, url_for, flash, request
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from models import db, User, Form
from forms import LoginForm, FormForm
from config import Config
from sqlalchemy.exc import IntegrityError
from web3 import Web3
from web3.exceptions import TimeExhausted
from datetime import datetime
import os

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
bcrypt = Bcrypt(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Load environment variables
etiketa_address = os.environ.get('DIRECCION_CONTRATO_ETIKETA')
etiketaPK = os.environ.get('CLAVE_PRIVADA_CREADOR_CONTRATO_ETIKETA')
provider = os.environ.get('WEB3_PROVIDER')
chainId = int(os.environ.get('WEB3_CHAIN_ID'))

# Setup Web3 connection
web3 = Web3(Web3.HTTPProvider(provider))  # Change to your Ethereum node URL
owner_addr = web3.eth.account.from_key(etiketaPK)

# Load contract
with open('static/abi/etiketa.abi', 'r') as f:
    etiketa_abi = f.read()

etiketa_contract = web3.eth.contract(abi=etiketa_abi, address=etiketa_address)

@login_manager.unauthorized_handler
def unauthorized():
    # Flash a custom message
    flash('Necesitas iniciar sesión para acceder a esa página.', 'warning')
    # Redirect to the login page
    return redirect(url_for('login'))

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        #import sys
        #print(f"User Password Hash: {user.password}", file=sys.stderr)
        #print(f"Form Password Data: {form.password.data}", file=sys.stderr)
        try:
            password_check = bcrypt.check_password_hash(user.password, form.password.data) if user else False
        except ValueError:
            password_check = False

        if user and password_check:
            login_user(user)
            return redirect(url_for('manage_forms'))
        else:
            flash('Usuario o contraseña incorrectos. Inténtelo de nuevo.')
    return render_template('login.html', title='Iniciar sesión', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/manage_forms', methods=['GET', 'POST'])
@login_required
def manage_forms():
    form = FormForm()
    if form.validate_on_submit():
        new_form = Form(responsable=form.responsable.data, lote=form.lote.data, fecha_elaboracion=form.fecha_elaboracion.data, user_id=current_user.id)
        db.session.add(new_form)
        try:
            db.session.commit()
            flash('Proceso productivo creado correctamente.')
            return redirect(url_for('manage_forms'))  # Redirect to load an empty form
        except IntegrityError:
            db.session.rollback()  # Roll back the transaction
            flash('Error: Ese número de lote ya existe.')
    forms = Form.query.filter_by(user_id=current_user.id).all()
    return render_template('manage_forms.html', title='Procesos productivos', nuevo_editar='Nuevo lote', form=form, forms=forms)

@app.route('/edit_form/<int:form_id>', methods=['GET', 'POST'])
@login_required
def edit_form(form_id):
    form = FormForm()
    form_to_edit = Form.query.get_or_404(form_id)
    if form_to_edit.user_id != current_user.id:
        flash('No tiene permiso para editar este lote.')
        return redirect(url_for('manage_forms'))
    if form.validate_on_submit():
        form_to_edit.responsable = form.responsable.data
        form_to_edit.lote = form.lote.data
        form_to_edit.fecha_elaboracion = form.fecha_elaboracion.data
        try:
            db.session.commit()
            flash('Datos actualizados correctamente.')
        except IntegrityError:
            db.session.rollback()  # Roll back the transaction
            flash('Error: Ese número de lote ya existe.')
            forms = Form.query.filter_by(user_id=current_user.id).all()
            return render_template('manage_forms.html', title='Procesos productivos', nuevo_editar='Editar lote', form=form, forms=forms, current_user=current_user)
        return redirect(url_for('manage_forms'))
    elif request.method == 'GET':
        form.responsable.data = form_to_edit.responsable
        form.lote.data = form_to_edit.lote
        form.fecha_elaboracion.data = form_to_edit.fecha_elaboracion
        
    forms = Form.query.filter_by(user_id=current_user.id).all()
    return render_template('manage_forms.html', title='Procesos productivos', nuevo_editar='Editar lote', form=form, forms=forms, current_user=current_user)

@app.route('/record_form/<int:form_id>', methods=['GET'])
@login_required
def record_form(form_id):
    form = Form.query.get_or_404(form_id)
    if form.user_id != current_user.id:
        flash('No tiene permiso para registrar este lote.')
        return redirect(url_for('manage_forms'))

    # Check if web3 connection is working
    if not web3.is_connected():
        flash('Error: No se pudo conectar con la blockchain.')
        return redirect(url_for('manage_forms'))
    # Prepare transaction
    nonce = web3.eth.get_transaction_count(owner_addr.address)
    try:
        # Check if form exists
        etiketa_contract.functions.getForm(form.lote).call()
        # If exists, call updateForm
        transaction_function = etiketa_contract.functions.updateForm
    except:
        # If not exists, call createForm
        transaction_function = etiketa_contract.functions.createForm

    transaction = transaction_function(
        form.responsable,
        form.lote,
        int(form.fecha_elaboracion.strftime('%s'))
    ).build_transaction({
        'from': owner_addr.address,
        'nonce': nonce,
        'chainId': chainId,
        'maxFeePerGas': 0,
        'maxPriorityFeePerGas': 0,
    })
    # Sign transaction with the private key
    signed_txn = web3.eth.account.sign_transaction(transaction, private_key=etiketaPK)

    # Send transaction
    txn_hash = web3.eth.send_raw_transaction(Web3.to_hex(signed_txn.rawTransaction))
    try:
        txn_receipt = web3.eth.wait_for_transaction_receipt(txn_hash, timeout=30)
        if txn_receipt.status != 1:
            flash(f'Error: La transacción no se completó correctamente. Estado: {txn_receipt.status}')
        else:
            flash('Lote registrado públicamente con éxito.')
    except TimeExhausted:
        flash('Error: La transacción excedió el tiempo de espera.')

    return redirect(url_for('manage_forms'))

@app.route('/lote/<int:lote_id>', methods=['GET'])
def show_form_data(lote_id):
    try:
        raw_form_data = etiketa_contract.functions.getForm(lote_id).call()
    except:
        message = "No hay datos disponibles para este lote."
        return render_template('informacion.html', message=message)
    # Convert raw data into a more suitable format for HTML processing
    form_data = {
        'responsable': raw_form_data[0],
        'lote': raw_form_data[1],
        'fecha_elaboracion': datetime.utcfromtimestamp(raw_form_data[2]).strftime('%Y-%m-%d')
    }
    return render_template('datos_etiqueta.html', form_data=form_data)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')


