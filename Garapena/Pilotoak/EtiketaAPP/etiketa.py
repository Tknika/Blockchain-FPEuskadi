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
from cryptography.fernet import Fernet
import os, json

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
url_etiketa = os.environ.get('URL_ETIKETA')
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

    # Create a dictionary to store private data
    private_data = {}
    # Retrieve and assign temperature data to the dictionary
    try:
        private_data['t_almacenamiento'] = get_device_data('temperature')
    except Exception as e:
        flash(f'Error al obtener datos de los dispositivos desde Thingsboard: {str(e)}')
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

    # Encrypt form_private data
    user_key = current_user.encryption_key
    fernet = Fernet(user_key)
    encrypted_data = fernet.encrypt(json.dumps(private_data).encode()).decode()
    # crear la transacción, POR AHORA GUARDAMOS EL MISMO DATO ENCRIPTADO
    transaction = transaction_function(
        form.lote,
        json.dumps(form.to_json()),
        encrypted_data
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

# Muestra la información pública del lote, no hace falta login
@app.route('/lote/<int:lote_id>', methods=['GET'])
def show_form_public_data(lote_id):
    try:
        raw_form_data = etiketa_contract.functions.getForm(lote_id).call()
    except:
        message = "No hay datos disponibles para este lote."
        return render_template('informacion.html', message=message)
    # Convert raw data into a more suitable format for HTML processing
    # vamos a mostrar los datos públicos:
    publicData = json.loads(raw_form_data[0])  # Convert JSON string to Python dictionary
    form_data = {
        'responsable': publicData['responsable'],
        'lote': publicData['lote'],
        'fecha_elaboracion': datetime.fromisoformat(publicData['fecha_elaboracion']).strftime('%Y-%m-%d')
    }
    return render_template('datos_etiqueta.html', form_data=form_data)

@app.route('/datosCompletos/<int:lote_id>', methods=['GET'])
@login_required
def show_form_all_data(lote_id):
    try:
        raw_form_data = etiketa_contract.functions.getForm(lote_id).call()
    except:
        message = "No hay datos disponibles para este lote."
        return render_template('informacion.html', message=message)
    # Convert raw data into a more suitable format for HTML processing
    # vamos a mostrar los datos pblicos:
    publicData = json.loads(raw_form_data[0])  # Convert JSON string to Python dictionary
    form_data_public = {
        'responsable': publicData['responsable'],
        'lote': publicData['lote'],
        'fecha_elaboracion': datetime.fromisoformat(publicData['fecha_elaboracion']).strftime('%Y-%m-%d')
    }
    # vamos a mostrar los datos privados:
    fernet = Fernet(current_user.encryption_key)
    decrypted_data = fernet.decrypt(raw_form_data[1].encode()).decode()
    privateData = json.loads(decrypted_data)  # Convert decrypted JSON string to Python dictionary
    # Check if the key 't_almacenamiento' exists in privateData, if not, leave it blank
    form_data_private = {
        't_almacenamiento': privateData.get('t_almacenamiento', '')
    }
    return render_template('datos_completos.html', form_data_public=form_data_public, form_data_private=form_data_private)

@app.route('/QR/<int:lote_id>', methods=['GET'])
def show_qr(lote_id):
    import qrcode
    try:
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=8,
            border=3,
        )
        url = f"{url_etiketa}/lote/{lote_id}"
        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        img_path = f"static/qr_codes/qr_{lote_id}.png"
        img.save(img_path)
        if not isinstance(lote_id, int) or lote_id <= 0:
            flash('Error: ID de lote inválido.')
            return redirect(url_for('manage_forms'))
        return render_template('show_qr.html', img_path=img_path, lote_id=lote_id, url=url)
    except:
        flash('Error al generar el QR.')
        return redirect(url_for('manage_forms'))

@app.route('/thingsboard/<key>', methods=['GET'])
def get_device_data(key):
    # Thingsboard platform details
    import requests, time, datetime
    # Configuration
    device_token = '27219850-0196-11ef-b82d-172c57c297f6' # DS18B20_Frigorifico_PT
    with open('refresh_JWT.txt', 'r') as file:
        refresh_token = file.read().strip()
    thingsboard_host = 'thingsboard.tknika.eus'
    #key = 'temperature'  # The telemetry key you want to average
    #start_ts = 1713265235112  # Start timestamp in milliseconds
    #end_ts = 1713265295110 # End timestamp in milliseconds
    current_ts = int(time.time() * 1000)  # Current timestamp in milliseconds
    interval_ts = 60000  # Interval in milliseconds
    start_ts = current_ts - interval_ts  # Start timestamp (60 seconds ago)
    end_ts = current_ts  # End timestamp (current time)
    
    # Function to refresh JWT token
    def refresh_jwt_token():
        refresh_url = f"https://{thingsboard_host}/api/auth/token"
        refresh_headers = {
            "Content-Type": "application/json"
        }
        refresh_body = {
            "refreshToken": refresh_token
        }
        refresh_response = requests.post(refresh_url, headers=refresh_headers, json=refresh_body)
        if refresh_response.status_code == 200:
            return refresh_response.json()['token']
        else:
            flash('Error obteniendo token JWT.')
            return None

    # Get a fresh JWT token
    JWT_token = refresh_jwt_token()
    if JWT_token is None:
        return redirect(url_for('manage_forms'))
    #import sys
    #print(f"JWT_token: {JWT_token}", file=sys.stderr)
    # Prepare the API endpoint and headers
    url = f"https://{thingsboard_host}/api/plugins/telemetry/DEVICE/{device_token}/values/timeseries"
    headers = {
        "Content-Type": "application/json",
        "X-Authorization": f"Bearer {JWT_token}"
    }
    params = {
        "keys": key,
        "startTs": start_ts,
        "endTs": end_ts,
        "agg": "AVG",
        "interval": interval_ts  # The interval over which to calculate the average
    }

    # Fetch the telemetry data
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    # print(f"data: {data}", file=sys.stderr)
    #returned_ts = data[key][0]['ts'] PARECE QUE HAY UN DESVÍO DE 2 HORAS
    #print(f"returned_ts: {datetime.datetime.fromtimestamp(returned_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
    # Lo que se obtiene es: {'temperature': [{'ts': 1713265265111, 'value': '2.0516666666666667'}]}
    # Extract the average value from the response
    '''
    if key in data and data[key]:
        avg_value = data[key][0]['value']  # Assuming the first (and only) entry is the average
        start_dt = datetime.datetime.fromtimestamp(start_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
        end_dt = datetime.datetime.fromtimestamp(end_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
        message = f'La media de \'{key}\' desde {start_dt} hasta {end_dt}: {float(avg_value):.2f}'
        return render_template('informacion.html', message=message)
    else:
        message = f'No se ha encontrado información para la clave {key} en el rango temporal dado.'
        return render_template('informacion.html', message=message)
    '''
    if key in data and data[key]:
        avg_value = data[key][0]['value']  # Assuming the first (and only) entry is the average
        return f"{float(avg_value):.2f}"
    else:
        # If no data is found for the given key and time range, raise an exception
        raise Exception(f'No se ha encontrado información para la clave {key} en el rango temporal dado.')
    
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')


