from funtzioak import *
import threading

app = Flask(__name__, template_folder='www', static_url_path='/static')

# Details on the Secret Key: https://flask.palletsprojects.com/en/2.3.x/config/#SECRET_KEY
# NOTE: The secret key is used to cryptographically-sign the cookies used for storing
#       the session data.
app.secret_key = 'J]+B!2+Ym(cO%hh8/uCL2i50N,Ma[}'


@app.route("/")
def hello_world():
    return render_template("index.html")

@app.get("/zerrenda/")
def listado():
    if not session_check():
        return redirect("/")
    formakuntzak = get_formakuntzak()
    return render_template("listado.html", formakuntzak=formakuntzak)
@app.route("/formakuntza_berria/")
def formakuntza_berria():
    if not session_check():
        return redirect("/")
    ikastetxeak, familiak = get_ikastetxeak_familiak()
    return render_template("formacion.html", ikastetxeak=ikastetxeak, familiak=familiak, formakuntza=None)

@app.route("/formakuntza_aldatu/<idfor>")
def formakuntza_aldatu(idfor):
    if not session_check():
        return redirect("/")
    ikastetxeak, familiak = get_ikastetxeak_familiak()
    formakuntza, ikasleak = get_formakuntza_partaideak(idfor)
    return render_template("formacion.html", ikastetxeak=ikastetxeak, familiak=familiak, formakuntza=formakuntza, ikasleak=ikasleak)

@app.route("/formakuntza_ikusi/<idfor>")
def formakuntza_ikusi(idfor):
    if not session_check():
        return redirect("/")
    ikas_fam_zik = get_formakuntza(idfor)
    formakuntza, ikasleak = get_formakuntza_partaideak(idfor)
    nfts = get_nft_info(idfor)
    return render_template("formacion_ver.html", ikas_fam_zik=ikas_fam_zik, formakuntza=formakuntza, ikasleak=ikasleak, nfts=nfts, idfor=idfor)

@app.route("/formakuntza_ezabatu/<idfor>")
def formakuntza_ezabatu(idfor):
    if not session_check():
        return redirect("/")
    del_formakuntza(idfor)
    return redirect("/zerrenda/")

@app.route('/zikloak/<familia_id>')
def zikloak(familia_id):
    zikloak = get_zikloak(familia_id)
    ziklo_zerrenda = [{'id': zik[0], 'izena': zik[1]} for zik in zikloak]
    return jsonify(ziklo_zerrenda)

@app.post("/formakuntza/")
def post_formakuntza():
    if not session_check():
        return redirect("/")
    izena = request.form.get('izena')
    data = request.form.get('data')
    ikastetxea = request.form.get('ikastetxea')
    ikastetxea = ikastetxea.split("-")[0]
    #familia = request.form.get('familia')
    zikloa = request.form.get('zikloa') 
    modulua = request.form.get('modulua') 
    fid = request.form.get('fid', None)
    if not fid:
        csvFile = request.files.get('fitxategia', None)
    #BBDD
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    if fid:
        query = "UPDATE formakuntzak SET idirakaslea = %s, izena = %s, idikastetxea = %s, idzikloa = %s, modulua = %s, data = %s WHERE id = %s"
        cursor.execute(query, (session["id"], izena, ikastetxea, zikloa, modulua, data, fid))
    else:
        query = "INSERT INTO formakuntzak (idirakaslea, izena, idikastetxea, idzikloa, modulua, data) VALUES (%s,%s,%s,%s,%s,%s)"
        cursor.execute(query, (session["id"], izena, ikastetxea, zikloa, modulua, data))
        idfor = cursor.lastrowid

    if not fid and csvFile and csvFile.filename and csvFile.filename != '':
        # Solo procesar el archivo si existe y tiene un nombre válido
        data = pd.read_csv(csvFile, delimiter=";", header=0)
        sql = "INSERT INTO partaideak (izena, emaila, idformakuntza, lokalizatzailea) VALUES (%s, %s, %s, %s)"
        partaideak = []
        for index, row in data.iterrows():
            lokalizatzailea = get_lokalizatzailea(idfor)
            partaideak.append((row["Izena"], row["emaila"], idfor, lokalizatzailea))
        cursor.executemany(sql, partaideak)
        
    cursor.close()
    bbdd.close()
    return redirect("/zerrenda/")

@app.post('/ikaslea_aldatu/')
def ikaslea_aldatu():
    id = request.form.get('id')
    nombre = request.form.get('izena')
    email = request.form.get('emaila')

    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'UPDATE partaideak SET izena = %s, emaila = %s WHERE id = %s'
    cursor.execute(query, (nombre, email, id))
    bbdd.close()

    return jsonify({'status': 'success'})

@app.post("/ikaslea_sortu/")
def ikaslea_sortu():
    if not session_check():
        return redirect("/")
    idfor = request.form.get('idfor')
    nombre = request.form.get('izena')
    email = request.form.get('emaila')
    lokalizatzailea = get_lokalizatzailea(idfor)
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'INSERT INTO partaideak (izena, emaila, idformakuntza, lokalizatzailea) VALUES (%s,%s,%s,%s)'
    cursor.execute(query, (nombre, email, idfor, lokalizatzailea))
    bbdd.close()
    return redirect("/formakuntza_aldatu/"+ idfor)

@app.route("/ikaslea_ezabatu/<idfor>/<idika>/")
def ikaslea_ezabatu(idfor, idika):
    if not session_check():
        return redirect("/")
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'DELETE FROM partaideak WHERE id = %s'
    cursor.execute(query, (idika,))
    bbdd.close()
    return redirect("/formakuntza_aldatu/"+ idfor)

def process_sortu_zihurtagiriak(idfor: str):
    # Ejecuta el trabajo pesado fuera del request, dentro del app context
    with app.app_context():
        bbdd = get_db_con()
        cursor = bbdd.cursor()
        query = 'SELECT izena, id, emaila, lokalizatzailea FROM partaideak WHERE idformakuntza = %s'
        cursor.execute(query, (idfor,))
        partaideak = cursor.fetchall()
        query = 'SELECT izena FROM formakuntzak WHERE id = %s'
        cursor.execute(query, (idfor,))
        formakuntza = cursor.fetchone()
        fizena = formakuntza[0]

        print(f"Contract address: {BK_CONTRACT_ADDRESS}", flush=True)

        width, height = landscape(A4)

        # Cargar la imagen de fondo
        bg_image_eus = ImageReader('static/img/CertificadoBlockchain_eus.png')
        bg_image_es = ImageReader('static/img/CertificadoBlockchain_es.png')
        # Registrar una fuente personalizada
        pdfmetrics.registerFont(TTFont('CustomFont', 'static/fonts/GothamMedium.ttf'))
        
        ids = []
        uris = []
        txt_infos = []
        certs = []
        for par in partaideak:
            ids.append(par[1])

            ######################## Crear PDF ########################
            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=landscape(A4))
            ############## EUSKERAZ ################
            pdf_orria_sortu(p, bg_image_eus, width, height, par[0]+"-(r)i", fizena, par[3])
            ############## CASTELLANO ################
            pdf_orria_sortu(p, bg_image_es, width, height, par[0], fizena , par[3])
            p.save()
            buffer.seek(0)
            ########## Fitxategia eta URI-a sortu ##########
            cert = par[0].replace(' ', '_')+"_ziurtagiria_"+idfor+".pdf"
            certs.append(cert)
            cert_path = f"static/certs/"+cert
            with open(cert_path, 'wb') as f:
                f.write(buffer.getbuffer())
            uri = BK_BASE_URI+cert_path
            uris.append(uri)
            ######################## FIN Crear PDF ########################

            ########## NFT-aren txt_infoa sortu ##########
            cur_dict = bbdd.cursor(dictionary=True)
            query = 'SELECT f.izena formakuntza, TO_CHAR(f.data,"dd/mm/yyyy") data, i.izena ikastetxea, fa.izena familia, z.izena zikloa, f.modulua modulua, ir.izena irakaslea FROM formakuntzak f, zikloak z, familiak fa, ikastetxeak i, irakasleak ir where i.kodea = f.idikastetxea AND f.idzikloa = z.id AND fa.id = z.idfam and f.idirakaslea = ir.id and f.id = %s'
            cur_dict.execute(query, (idfor,))
            formakuntza = cur_dict.fetchone()
            formakuntza["izena"] = par[0]
            formakuntza = {k: f"{v}" for k,v in formakuntza.items()}
            txt_info = json.dumps(formakuntza)
            txt_infos.append(txt_info)

        ########## NFT-a sortu blockchainean ##########
        #tokenId = nft_sortu(uri, txt_info)
        tokenIds = nft_sortu_batch(uris, txt_infos)

        for i, par in enumerate(partaideak):
            query = 'UPDATE partaideak SET tokenId = %s WHERE id = %s'
            cursor.execute(query, (tokenIds[i], ids[i]))
            ########## EMAILA BIDALI ##########
            bidali_emaila(par[2], par[0], par[3], formakuntza['formakuntza'],certs[i])

        # El estado blockchain ya se actualizó en el endpoint principal
        cursor.close()
        bbdd.close()


@app.get('/sortu_zihurtagiriak/<idfor>')
def sortu_zihurtagiriak(idfor):
    if not session_check():
        return redirect("/")
    
    # Actualizar inmediatamente el estado blockchain a 1 para deshabilitar botones
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'UPDATE formakuntzak SET blockchain = 1 WHERE id = %s'
    cursor.execute(query, (idfor,))
    cursor.close()
    bbdd.close()
    
    # Lanzar el proceso en background y responder de inmediato
    threading.Thread(target=process_sortu_zihurtagiriak, args=(idfor,), daemon=True).start()
    
    # Si es una petición AJAX, devolver respuesta JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'status': 'success', 'message': 'Proceso iniciado correctamente'})
    
    return redirect("/zerrenda/")

@app.route('/ikusi_nft_info/<lok>')
def ikusi_nft_info(lok):
    contract = get_contract()[0]
    tokenId = get_TokenId(lok)
    info = contract.functions.tokenTextInfo(int(tokenId)).call()
    print("Info: "+info, flush=True)
    info = info.encode().decode('unicode-escape')
    print("Info: "+info, flush=True)
    info = ast.literal_eval(info)
    info["uri"] = contract.functions.tokenURI(int(tokenId)).call()
    return render_template("certificado.html", info=info)

@app.route('/bidali_emaila/<lok>/<idfor>')
def bidali_emaila_partaideari(lok, idfor):
    contract = get_contract()[0]
    tokenId = get_TokenId(lok)
    emaila = get_emaila(lok)
    info = contract.functions.tokenTextInfo(int(tokenId)).call()
    info = info.encode().decode('unicode-escape')
    info = ast.literal_eval(info)
    print(info, flush=True)
    cert = contract.functions.tokenURI(int(tokenId)).call().split('/')[-1]
    bidali_emaila(emaila, info['izena'], lok, info['formakuntza'], cert)
    return redirect("/formakuntza_ikusi/"+idfor)

@app.post("/login/")
def login():
    email = request.form.get('email')
    password = request.form.get('password')
    erabiltzailea = get_erabiltzailea(email, password)
    if erabiltzailea:
        session['id'] = erabiltzailea[0]
        session['izena'] = erabiltzailea[1]
        return redirect("/zerrenda/")
    else:
        return redirect("/")

@app.route('/logout/')
def logout():
    # Borramos el id y nombre de usuario de la session
    session.pop('id', default=None)
    session.pop('izena', default=None)
    return redirect("/")


@app.post('/pasahitza_aldatu/')
def cambiar_contrasena():
    if not session_check():
        return redirect("/")
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    if new_password != confirm_password:
        return jsonify({'status': 'error', 'message': 'Las contraseñas no coinciden'})
    
    pass_ant = get_pasahitza(session["id"])
    
    if not pass_ant == sha1_hash_sortu(current_password):
        return jsonify({'status': 'error', 'message': 'Contraseña actual incorrecta'})
    update_pasahitza(session["id"], new_password)

    return jsonify({'status': 'success', 'message': 'Contraseña actualizada correctamente'})

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, threaded=True, use_reloader=False)
