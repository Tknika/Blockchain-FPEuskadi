from flask import Flask, render_template, redirect, url_for, flash, request
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from models import db, User, Form
from forms import LoginForm, FormForm
from config import Config
from sqlalchemy.exc import IntegrityError
from web3 import Web3
from web3.exceptions import TimeExhausted
from datetime import datetime, time
from cryptography.fernet import Fernet
import os, json
from thingsboard import get_devices_data

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

def date_to_timestamp(date_obj):
    # Convert a date object to a datetime object at midnight of the same day
    datetime_obj = datetime.combine(date_obj, time())
    return int(datetime_obj.timestamp() * 1000)

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
        new_form = Form(
            nombre_producto=form.nombre_producto.data,
            lote=form.lote.data,
            fecha_elaboracion=form.fecha_elaboracion.data,
            nombre_elaborador=form.nombre_elaborador.data,
            obrador_elaborador=form.obrador_elaborador.data,
            registro_sanitario=form.registro_sanitario.data,
            modo_produccion=form.modo_produccion.data,
            modo_elaboracion=form.modo_elaboracion.data,
            ingredientes=form.ingredientes.data,
            aditivos=form.aditivos.data,
            conservantes=form.conservantes.data,
            tratamiento_conservacion=form.tratamiento_conservacion.data,
            formato=form.formato.data,
            apto_celiaco=form.apto_celiaco.data,
            producto_vegano=form.producto_vegano.data,
            tipo_envase=form.tipo_envase.data,
            fecha_caducidad=form.fecha_caducidad.data,
            fecha_almacenamiento_mp=form.fecha_almacenamiento_mp.data,
            lugar_almacenamiento=form.lugar_almacenamiento.data,
            tratamiento_termico=form.tratamiento_termico.data,
            user_id=current_user.id
        )
        db.session.add(new_form)
        try:
            db.session.commit()
            flash('Proceso productivo creado correctamente.')
            return redirect(url_for('manage_forms'))  # Redirect to load an empty form
        except IntegrityError:
            db.session.rollback()  # Roll back the transaction
            flash('Error: Ese número de lote ya existe.')
        except Exception as e:
            db.session.rollback()  # Roll back the transaction for any other unexpected exception
            flash(f'Error inesperado: {str(e)}')
    else:
        for fieldName, errorMessages in form.errors.items():
            for err in errorMessages:
                flash(f'Error en {fieldName}: {err}', 'error')

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
        form_to_edit.nombre_producto = form.nombre_producto.data
        form_to_edit.lote = form.lote.data
        form_to_edit.fecha_elaboracion = form.fecha_elaboracion.data
        form_to_edit.nombre_elaborador = form.nombre_elaborador.data
        form_to_edit.obrador_elaborador = form.obrador_elaborador.data
        form_to_edit.registro_sanitario = form.registro_sanitario.data
        form_to_edit.modo_produccion = form.modo_produccion.data
        form_to_edit.modo_elaboracion = form.modo_elaboracion.data
        form_to_edit.ingredientes = form.ingredientes.data
        form_to_edit.aditivos = form.aditivos.data
        form_to_edit.conservantes = form.conservantes.data
        form_to_edit.tratamiento_conservacion = form.tratamiento_conservacion.data
        form_to_edit.formato = form.formato.data
        form_to_edit.apto_celiaco = form.apto_celiaco.data
        form_to_edit.producto_vegano = form.producto_vegano.data
        form_to_edit.tipo_envase = form.tipo_envase.data
        form_to_edit.fecha_caducidad = form.fecha_caducidad.data
        form_to_edit.fecha_almacenamiento_mp = form.fecha_almacenamiento_mp.data
        form_to_edit.lugar_almacenamiento = form.lugar_almacenamiento.data
        form_to_edit.tratamiento_termico = form.tratamiento_termico.data
        try:
            db.session.commit()
            flash('Datos actualizados correctamente.')
        except IntegrityError:
            db.session.rollback()  # Roll back the transaction
            flash('Error: Ese número de lote ya existe.')
            forms = Form.query.filter_by(user_id=current_user.id).all()
            return render_template('manage_forms.html', title='Procesos productivos', nuevo_editar='Editar lote', form=form, forms=forms, current_user=current_user)
        except Exception as e:
            db.session.rollback()  # Roll back the transaction for any other unexpected exception
            flash(f'Error inesperado: {str(e)}')
        return redirect(url_for('manage_forms'))
    elif request.method == 'GET':
        form.nombre_producto.data = form_to_edit.nombre_producto
        form.lote.data = form_to_edit.lote
        form.fecha_elaboracion.data = form_to_edit.fecha_elaboracion
        form.nombre_elaborador.data = form_to_edit.nombre_elaborador
        form.obrador_elaborador.data = form_to_edit.obrador_elaborador
        form.registro_sanitario.data = form_to_edit.registro_sanitario
        form.modo_produccion.data = form_to_edit.modo_produccion
        form.modo_elaboracion.data = form_to_edit.modo_elaboracion
        form.ingredientes.data = form_to_edit.ingredientes
        form.aditivos.data = form_to_edit.aditivos
        form.conservantes.data = form_to_edit.conservantes
        form.tratamiento_conservacion.data = form_to_edit.tratamiento_conservacion
        form.formato.data = form_to_edit.formato
        form.apto_celiaco.data = form_to_edit.apto_celiaco
        form.producto_vegano.data = form_to_edit.producto_vegano
        form.tipo_envase.data = form_to_edit.tipo_envase
        form.fecha_caducidad.data = form_to_edit.fecha_caducidad
        form.fecha_almacenamiento_mp.data = form_to_edit.fecha_almacenamiento_mp
        form.lugar_almacenamiento.data = form_to_edit.lugar_almacenamiento
        form.tratamiento_termico.data = form_to_edit.tratamiento_termico
    else:
        for fieldName, errorMessages in form.errors.items():
            for err in errorMessages:
                flash(f'Error en {fieldName}: {err}', 'error')

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
    # Retrieve and assign data to the dictionary
    fecha_registro = datetime.now() #int(datetime.now().timestamp() * 1000)
    try:
        import sys
        print(f"Fecha almacenamiento: {form.fecha_almacenamiento_mp}", file=sys.stderr)
        print(f"Fecha elaboración: { form.fecha_elaboracion}", file=sys.stderr)
        print(f"Fecha registro: { fecha_registro}", file=sys.stderr)
        private_data = get_devices_data(date_to_timestamp(form.fecha_almacenamiento_mp), date_to_timestamp(form.fecha_elaboracion), int(fecha_registro.timestamp() * 1000))

    except Exception as e:
        flash(f'Error al obtener datos de los dispositivos desde Thingsboard: {str(e)}')
        return redirect(url_for('manage_forms'))
    # añadimos los campos privados que no se almacenarán en los datos públicos
    private_data['fecha_almacenamiento'] = form.fecha_almacenamiento_mp.strftime('%Y-%m-%d') if form.fecha_almacenamiento_mp else None
    private_data['lugar_almacenamiento'] = form.lugar_almacenamiento
    private_data['tratamiento_termico'] = form.tratamiento_termico
    private_data['fecha_registro'] = fecha_registro.strftime('%Y-%m-%d %H:%M:%S')
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
        if txn_receipt.status == 1:
            flash('Lote registrado públicamente con éxito.')
        elif txn_receipt.status == 0:
            flash('Error: La transacción ha fallado y ha sido revertida.')
        else:
            flash(f'Error: La transacción no se completó correctamente. Estado desconocido: {txn_receipt.status}')
    except TimeExhausted:
        flash('Error: La transacción excedió el tiempo de espera.')

    return redirect(url_for('manage_forms'))

# Muestra la información pública del lote, no hace falta login
@app.route('/lote/<int:lote_id>', methods=['GET'])
def show_form_public_data(lote_id):
    try:
        raw_form_data = etiketa_contract.functions.getForm(lote_id).call()
        if not raw_form_data:
            message = "No hay datos disponibles para este lote."
            return render_template('informacion.html', message=message)
    except Exception as e:
        message = f"Error al recuperar los datos: {str(e)}"
        return render_template('informacion.html', message=message)
    # Convert raw data into a more suitable format for HTML processing
    # vamos a mostrar los datos públicos:
    publicData = json.loads(raw_form_data[0])  # Convert JSON string to Python dictionary
    form_data = {
        'nombre_producto': publicData['nombre_producto'],
        'lote': publicData['lote'],
        'fecha_elaboracion': datetime.fromisoformat(publicData['fecha_elaboracion']).strftime('%Y-%m-%d'),
        'obrador_elaborador': publicData['obrador_elaborador'],
        'registro_sanitario': publicData['registro_sanitario'],
        'modo_produccion': publicData['modo_produccion'],
        'modo_elaboracion': publicData['modo_elaboracion'],
        'ingredientes': publicData['ingredientes'],
        'aditivos': publicData['aditivos'],
        'conservantes': publicData['conservantes'],
        'tratamiento_conservacion': publicData['tratamiento_conservacion'],
        'formato': publicData['formato'],
        'apto_celiaco': publicData['apto_celiaco'],
        'producto_vegano': publicData['producto_vegano'],
        'tipo_envase': publicData['tipo_envase'],
        'fecha_caducidad': datetime.fromisoformat(publicData['fecha_caducidad']).strftime('%Y-%m-%d')
    }
    user_id = publicData['user_id']
    img_path = f"static/images/{user_id}/" #carpeta donde se encuentran las imágenes
    return render_template('datos_etiqueta.html', form_data=form_data, img_path=img_path)

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
        'nombre_producto': publicData['nombre_producto'],
        'lote': publicData['lote'],
        'fecha_elaboracion': datetime.fromisoformat(publicData['fecha_elaboracion']).strftime('%Y-%m-%d'),
        'obrador_elaborador': publicData['obrador_elaborador'],
        'registro_sanitario': publicData['registro_sanitario'],
        'modo_produccion': publicData['modo_produccion'],
        'modo_elaboracion': publicData['modo_elaboracion'],
        'ingredientes': publicData['ingredientes'],
        'aditivos': publicData['aditivos'],
        'conservantes': publicData['conservantes'],
        'tratamiento_conservacion': publicData['tratamiento_conservacion'],
        'formato': publicData['formato'],
        'apto_celiaco': publicData['apto_celiaco'],
        'producto_vegano': publicData['producto_vegano'],
        'tipo_envase': publicData['tipo_envase'],
        'fecha_caducidad': datetime.fromisoformat(publicData['fecha_caducidad']).strftime('%Y-%m-%d')
    }
    user_id = publicData['user_id']
    img_path = f"static/images/{user_id}/"
    # vamos a mostrar los datos privados:
    fernet = Fernet(current_user.encryption_key)
    decrypted_data = fernet.decrypt(raw_form_data[1].encode()).decode()
    privateData = json.loads(decrypted_data)  # Convert decrypted JSON string to Python dictionary
    # Check if the key 't_almacenamiento' exists in privateData, if not, leave it blank
    #form_data_private = {}
    #for key, value in privateData.items():
    #    form_data_private[key] = value
    return render_template('datos_completos.html', form_data_public=form_data_public, form_data_private=privateData, img_path=img_path)

@app.route('/transacciones/<int:lote_id>', methods=['GET'])
@login_required
def show_all_transacions(lote_id):
    try:
        # Retrieve the FormCreated and FormUpdated events for the specified lote_id
        form_created_filter = etiketa_contract.events.FormCreated.create_filter(fromBlock=0, argument_filters={'lote': lote_id})
        form_updated_filter = etiketa_contract.events.FormUpdated.create_filter(fromBlock=0, argument_filters={'lote': lote_id})
        
        # Get all entries from the filters
        created_events = form_created_filter.get_all_entries()
        updated_events = form_updated_filter.get_all_entries()
        
        # Prepare data for display
        transactions = []
        for event in created_events:
            transactions.append({
                'type': 'Creado',
                'lote': event['args']['lote'],
                'publicData': event['args']['publicData'],
                'privateData': event['args']['privateData'],
                'blockNumber': event['blockNumber']
            })
        for event in updated_events:
            transactions.append({
                'type': 'Actualizado',
                'lote': event['args']['lote'],
                'publicData': event['args']['publicData'],
                'privateData': event['args']['privateData'],
                'blockNumber': event['blockNumber']
            })
        
        # Sort transactions by block number
        transactions.sort(key=lambda x: x['blockNumber'], reverse=True)
        
        # Render the transactions in a new HTML template
        return render_template('transacciones.html', transactions=transactions, lote_id=lote_id)
    except Exception as e:
        # Handle errors and exceptions
        flash(f'Error al recuperar las transacciones: {str(e)}')
        return redirect(url_for('manage_forms'))
    
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
