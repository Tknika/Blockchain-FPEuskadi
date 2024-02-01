from flask import Flask, render_template, request
from web3 import Web3
import os

app = Flask(__name__, template_folder='www', static_url_path='/static')
contract_addr = os.environ.get('DIRECCION_CONTRATO_ZIURTAGIRIAK')
provider = "http://besu_node3:8545"
#to-do: definir el provider dentro de las funciones seleccionando uno cada vez

@app.route("/")
def hello_world():
    return render_template("index.html")

@app.get("/jardunaldia/")
def get_jardunaldia():
    import mysql.connector as con
    bbdd = con.connect(host='database', database='ziurtagiriak', user='ziurtagiriak', password='ziurtagiriak', autocommit=True)
    cursor = bbdd.cursor()
    query = "SELECT id, izena FROM erakundeak"
    cursor.execute(query)
    return render_template("jardunaldia.html", cursor = cursor)

@app.post("/jardunaldia/")
def post_jardunaldia():
    import smtplib, ssl, string, random
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import mysql.connector as con


    port = 465  # For SSL
    sender_email = "noreply.moodle@icjardin.com"
    password = "L0rategiHiri@"

    # Create a secure SSL context
    context = ssl.create_default_context()    
    
    erakundea = request.form.get('erakundea')
    emailea = request.form.get('emailea')
    formakuntza = request.form.get('formakuntza')
    lekua = request.form.get('lekua') 
    data = request.form.get('data')
    csvFile = request.files['csv'].readlines()
    print(erakundea, emailea, formakuntza, lekua, data)
    #BBDD
    bbdd = con.connect(host='database', database='ziurtagiriak', user='ziurtagiriak', password='ziurtagiriak', autocommit=True)
    cursor = bbdd.cursor()
    query = "INSERT INTO jardunaldiak (iderakundea, emailea, formakuntza, data, lekua) VALUES (%s,%s,%s,%s,%s)"
    cursor.execute(query, (erakundea, emailea, formakuntza, data, lekua))
    id_jar = cursor.lastrowid
    newline = '\n'
    
    primera_linea = True
    with smtplib.SMTP_SSL("smtp.gmail.com", port, context=context) as server:
        server.login(sender_email, password)
        for row in csvFile:
            if primera_linea:
                primera_linea = False
            else:
                linea = row.decode().split(";")
                izena = linea[0]
                receiver_email = linea[1]
                receiver_email = "aiza@fpzornotza.com"
                localizador = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                query = "INSERT INTO partaideak (izena, emaila, lokalizatzailea, id_jardunaldia) VALUES (%s,%s,%s,%s)"
                cursor.execute(query, (izena, receiver_email, localizador, id_jar))
                id_par = cursor.lastrowid
                email_lok = str(id_jar%100) + "-" + str(localizador) + "-" + str(id_par%100)
                email_lok = f"{id_jar%100:02d}" + "-" + str(localizador) + "-" + f"{id_par%100:02d}"
                print("The generated random string : " + email_lok)

                message = MIMEMultipart("alternative")
                message["Subject"] = formakuntza + " - Ziurtagiri froga"
                message["From"] = sender_email
                message["To"] = receiver_email
                with open("static/email.html", "r") as f:
                    mail_html = f.read().replace("{{izena}}", izena).replace("{{email_lok}}", email_lok).replace("{{formakuntza}}", formakuntza)
                with open("static/email.txt", "r") as f:
                    mail_text = f.read().replace("{{izena}}", izena).replace("{{email_lok}}", email_lok).replace("{{formakuntza}}", formakuntza)
                part1 = MIMEText(mail_text, "plain")
                part2 = MIMEText(mail_html, "html")

                # Add HTML/plain-text parts to MIMEMultipart message
                # The email client will try to render the last part first
                message.attach(part1)
                message.attach(part2)

                
                # TODO: Send email here
                server.sendmail(sender_email, receiver_email, message.as_string())
                
    cursor.close()
    bbdd.close()
    return render_template("jardunaldia.html")

def loka(lokalizatzailea):
    import mysql.connector as con
    lok = lokalizatzailea.split("-")
    if (len(lok) == 3):
        bbdd = con.connect(host='database', database='ziurtagiriak', user='ziurtagiriak', password='ziurtagiriak', autocommit=True)
        cursor = bbdd.cursor()
        query = """SELECT p.izena, p.emaila, e.izena, j.emailea, j.formakuntza, j.data, j.lekua, p.id
        FROM partaideak p, jardunaldiak j, erakundeak e
        WHERE j.id = p.id_jardunaldia AND e.id = j.iderakundea AND %s = p.lokalizatzailea AND %s = p.id%100 AND %s = j.id%100"""
        cursor.execute(query, (lok[1], int(lok[2]), int(lok[0])))
        print(cursor)
        row = cursor.fetchone()
        if row:
            """ izena = row[0]
            emaila = row[1]
            erakundea = row[2]
            emailea = row[3]
            formakuntza = row[4]
            data = row[5]
            lekua = row[6] """
            print("AAAA")
            cursor.close()
            bbdd.close()
            return render_template("ziurtagiria.html",row=row, lok=lokalizatzailea)

        else:
            cursor.close()
            bbdd.close()
            return render_template("lokalizatzailea.html",error="bai")
    else:
        return render_template("lokalizatzailea.html",error="bai")

    

def ezabatu_ziurtagiria(lokalizatzailea):
    import mysql.connector as con
    lok = lokalizatzailea.split("-")
    bbdd = con.connect(host='database', database='ziurtagiriak', user='ziurtagiriak', password='ziurtagiriak', autocommit=True)
    cursor = bbdd.cursor()
    query = "DELETE FROM partaideak WHERE %s = lokalizatzailea AND %s = id%100"
    cursor.execute(query, (lok[1], int(lok[2])))
    
    print(cursor)
    cursor.close()
    bbdd.close()
    return 0

    
    
@app.route('/lokalizatzailea/<lok>')
def lokalizatzailea(lok):
    return loka(lok)

@app.get("/lokalizatzailea/")
def get_lokalizatzailea():
    return render_template("lokalizatzailea.html")

@app.post("/lokalizatzailea/")
def post_lokalizatzailea():
    lok = request.form.get('lokalizatzailea')
    return loka(lok)
    """ contract=request.form.get('contract_address')
    print(contract)
    web3 = Web3(Web3.HTTPProvider(provider))

    conexion = None
    metodos = None

    if web3.isConnected():
        conexion = True
        contract_object = web3.eth.contract(abi=abi, address=contract)
        message = contract_object.functions.speak().call()
        metodos = contract_object.functions._functions
        return render_template("contract.html",message=message, conexion=str(conexion), functions=metodos) """

@app.route('/sortu_nft_baztertu/', methods=['GET', 'POST'])
def post_sortu_nft_baztertu():
    import mysql.connector as con
    from xml.dom import minidom
    import hashlib
    from web3.middleware import geth_poa_middleware
    addr = request.form.get('addr')
    lokalizatzailea = request.form.get('lok')
    if addr:
        with open("static/abi/ziurtagiriak.abi", "r") as f:
            abi = f.read()
        web3 = Web3(Web3.HTTPProvider(provider))
        #Berria 10/11/2023
        web3.middleware_onion.inject(geth_poa_middleware, layer=0)
        # Note: Never commit your key in your code! Use env variables instead:
	# pk = os.environ.get('PRIVATE_KEY')

	# Instantiate an Account object from your key:
	# owner_addr = w3.eth.account.from_key(pk)
        clave_privada = os.environ.get('CLAVE_PRIVADA_CREADOR_CONTRATO_ZIURTAGIRIAK')
        
        owner_addr = web3.eth.account.from_key(clave_privada)
        #Bukatu berria

        path = "http://localhost:5000/static/nft/"
        #path = "http://ziurtagiriak.localhost/static/nft/"

        lok = lokalizatzailea.split("-")
        bbdd = con.connect(host='database', database='ziurtagiriak', user='ziurtagiriak', password='ziurtagiriak', autocommit=True)
        cursor = bbdd.cursor()
        query = """SELECT p.izena, p.emaila, e.izena, j.emailea, j.formakuntza, j.data, j.lekua, p.id
        FROM partaideak p, jardunaldiak j, erakundeak e
        WHERE j.id = p.id_jardunaldia AND e.id = j.iderakundea AND %s = p.lokalizatzailea AND %s = p.id%100 AND %s = j.id%100"""
        cursor.execute(query, (lok[1], int(lok[2]), int(lok[0])))
        ret = ""
        print(cursor)
        if cursor:
            row = cursor.fetchone()
            ret += str(row[0]) + str(row[1]) + str(row[2]) + str(row[3]) + str(row[4]) + str(row[5]) + str(row[6]) + str(row[7])
            izena = row[0]
            emaila = row[1]
            erakundea = row[2]
            emailea = row[3]
            formakuntza = row[4]
            data = row[5]
            lekua = row[6]

            root = minidom.Document()
            xml = root.createElement('ziurtagiria') 
            xml.setAttribute('lokalizatzailea', lokalizatzailea)
            root.appendChild(xml)
            xml_formakuntza = root.createElement('formakuntza')
            text_form = root.createTextNode(formakuntza)
            xml_formakuntza.appendChild(text_form)
            xml_erakundea = root.createElement('erakundea')
            text_erakundea = root.createTextNode(erakundea)
            xml_erakundea.appendChild(text_erakundea)
            xml_emailea = root.createElement('emailea')
            text_emailea = root.createTextNode(emailea)
            xml_emailea.appendChild(text_emailea)
            xml_data = root.createElement('data')
            text_data = root.createTextNode(data)
            xml_data.appendChild(text_data)
            xml_lekua = root.createElement('lekua')
            text_lekua = root.createTextNode(lekua)
            xml_lekua.appendChild(text_lekua)
            xml_partaidea = root.createElement('partaidea')
            text_partaidea = root.createTextNode(izena)
            xml_partaidea.appendChild(text_partaidea)
            
            xml.appendChild(xml_formakuntza)
            xml.appendChild(xml_erakundea)
            xml.appendChild(xml_emailea)
            xml.appendChild(xml_data)
            xml.appendChild(xml_lekua)
            xml.appendChild(xml_partaidea)
            
            xml_str = root.toprettyxml(indent ="\t") 
            print(xml_str)
            xml_hash = hashlib.sha256(xml_str.encode('utf-8')).hexdigest()
            print(xml_hash)
            
            save_path_file = "static/nft/" + xml_hash + ".xml"
            print(save_path_file)
            
            with open(save_path_file, "w") as f:
                f.write(xml_str) 
            uri = path+xml_hash+".xml"

        if web3.is_connected():
            print("Web3 conectado, direccion contrato: ", contract_addr, flush=True)
            #print("Web3 conectado, direccion owner: ", owner_addr.address, flush=True)
            contract_object = web3.eth.contract(abi=abi, address=contract_addr)
            # sse = contract_object.functions.safeMint(addr, uri).transact({"from": owner_addr})
            #Berria 10/11/2023
            #print("Transaction count para este owner: ",  web3.eth.get_transaction_count(owner_addr.address), flush=True);
            #print("SafeMint addr: ",  addr, flush=True);
            #print("SafeMint uri:",  uri, flush=True);
            
            sse = contract_object.functions.safeMint(addr, uri).build_transaction({"from": owner_addr.address, "nonce": web3.eth.get_transaction_count(owner_addr.address), "maxFeePerGas": 0, "maxPriorityFeePerGas": 0}) 
            #, "gas": 0, "type": 2})
            #, "chainId": 1337})
            #print("SafeMint realizado, clave privada owner: ", owner_addr.key, flush=True)
            #print("Objeto contrato: ", flush=True)
            #print(sse, flush=True)
            #print("SafeMint realizado, clave privada owner: ", owner_addr.key, flush=True)
            signed_tx = web3.eth.account.sign_transaction(dict(sse), private_key=owner_addr.key)
            
            #print("Transaccion firmada, transaccion:", flush=True)
            #print(signed_tx, flush=True)
            #print("Transaccion firmada, RAW transaccion:", flush=True)
            #print(signed_tx.rawTransaction, flush=True)
            # Send the raw transaction:
            #assert billboard.functions.message().call() == "gm"
            tx_hash = web3.eth.send_raw_transaction(Web3.to_hex(signed_tx.rawTransaction))
            web3.eth.wait_for_transaction_receipt(tx_hash)
            #assert billboard.functions.message().call() == "gn"
            #Bukatu Berria
            #print(sse, flush=True)
            #print(tx_hash, flush=True)
        ezabatu_ziurtagiria(lokalizatzailea)
        return render_template("nft.html")
    else:
        ezabatu_ziurtagiria(lokalizatzailea)
        return render_template("nft-baztertu.html")

@app.get("/nft-bilatzailea/")
def get_bilatzailea():
    return render_template("nft-bilatzailea.html")

@app.post("/nft-bilatzailea/")
def post_bilatzailea():
    addr = request.form.get('addr')
    print(addr)
    if addr:
        with open("static/abi/ziurtagiriak.abi", "r") as f:
            abi = f.read()
        web3 = Web3(Web3.HTTPProvider(provider))

        path = "http://localhost:5000/static/nft/"
        lok = ""
        uri = path+lok+".xml"

        if web3.is_connected():
            contract_object = web3.eth.contract(abi=abi, address=contract_addr)
            number_nft = contract_object.functions.balanceOf(addr).call()
            print("Total NFTs: ", str(number_nft))
            nfts = []
            for i in range(number_nft):
                id_nft = contract_object.functions.tokenOfOwnerByIndex(addr, i).call()
                uri_nft = contract_object.functions.tokenURI(id_nft).call()
                nfts.append(uri_nft)

    return render_template("nft-bilatzailea.html", total=number_nft, nfts=nfts)

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
