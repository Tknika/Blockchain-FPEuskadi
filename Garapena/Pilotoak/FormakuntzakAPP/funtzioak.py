from flask import Flask, render_template, request, session, jsonify, redirect, send_file
from web3 import Web3
#from web3.middleware import geth_poa_middleware
from web3.middleware import ExtraDataToPOAMiddleware
import mysql.connector as con
import pandas as pd
import random, string, hashlib, io, json, ast, os, smtplib, ssl
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import formatdate
from typing import Optional, List

########### VARIABLES GLOBALES ###########
DB_HOST = os.environ.get('DB_HOST')
DB_DATABASE = os.environ.get('DB_DATABASE')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')

BK_PROVIDER = list(os.environ.get('BK_PROVIDER').split(","))
BK_PROVIDER_PORT = os.environ.get('BK_PROVIDER_PORT')
BK_CHAIN_ID = int(os.environ.get('BK_CHAIN_ID'))
BK_CONTRACT_ADDRESS = os.environ.get('BK_CONTRACT_ADDRESS')
BK_ABI_PATH = os.environ.get('BK_ABI_PATH')
BK_OWNER_ADDRESS = os.environ.get('BK_OWNER_ADDRESS')
BK_OWNER_PRIVATE = os.environ.get('BK_OWNER_PRIVATE')
BK_BASE_URI = os.environ.get('BK_BASE_URI')

EM_PORT = os.environ.get('EM_PORT')
EM_SERVER = os.environ.get('EM_SERVER')
EM_SENDER = os.environ.get('EM_SENDER')
EM_SENDER_PASSWORD = os.environ.get('EM_SENDER_PASSWORD')

####################### DATABASE #######################
def get_db_con():
    bbdd = con.connect(host=DB_HOST, database=DB_DATABASE, user=DB_USER, password=DB_PASSWORD, autocommit=True)
    return bbdd

def get_ikastetxeak_familiak():
    bbdd = get_db_con()
    cursor_ik = bbdd.cursor()
    query_ik = 'SELECT kodea, izena FROM ikastetxeak'
    cursor_ik.execute(query_ik)
    ikastetxeak = cursor_ik.fetchall()

    cursor_fam = bbdd.cursor()
    query_fam = 'SELECT id, izena FROM familiak'
    cursor_fam.execute(query_fam)
    familiak = cursor_fam.fetchall()
    bbdd.close()
    return ikastetxeak, familiak

def get_formakuntza_partaideak(idfor):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'SELECT fo.id, fo.izena, fo.modulua, fo.data, fa.id, fa.izena, z.id, z.izena, i.kodea, i.izena FROM formakuntzak fo, familiak fa, zikloak z, ikastetxeak i where fo.id = %s and z.idfam = fa.id and fo.idzikloa = z.id and fo.idikastetxea = i.kodea'
    cursor.execute(query, (idfor,))
    formakuntza = cursor.fetchone()
    query = 'SELECT id, izena, emaila, tokenId, lokalizatzailea FROM partaideak WHERE idformakuntza = %s'
    cursor.execute(query, (idfor,))
    partaideak = cursor.fetchall()
    bbdd.close()
    return formakuntza, partaideak

def get_formakuntzak():
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query_ik = 'SELECT f.data, f.izena, f.modulua, z.izena, f.id, f.blockchain FROM formakuntzak f, zikloak z where f.idzikloa = z.id and f.idirakaslea = %s order by f.data'
    cursor.execute(query_ik, (session["id"],))
    formakuntzak = cursor.fetchall()
    bbdd.close()
    return formakuntzak

def get_formakuntza(idfor):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'SELECT z.izena, fa.izena, i.izena FROM formakuntzak f, zikloak z, familiak fa, ikastetxeak i where i.kodea = f.idikastetxea AND f.idzikloa = z.id AND fa.id = z.idfam and f.id = %s'
    cursor.execute(query, (idfor,))
    ikas_fam_zik = cursor.fetchone()
    bbdd.close()
    return ikas_fam_zik

def del_formakuntza(idfor):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'DELETE FROM partaideak WHERE idformakuntza = %s'
    cursor.execute(query, (idfor,))
    query = 'DELETE FROM formakuntzak WHERE id = %s'
    cursor.execute(query, (idfor,))
    bbdd.close()
    return None

def get_zikloak(familia_id):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'SELECT id, izena FROM zikloak WHERE idfam = %s order by izena'
    cursor.execute(query, (familia_id,))
    zikloak = cursor.fetchall()
    bbdd.close()
    return zikloak

def get_TokenId(lok):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'SELECT tokenId FROM partaideak WHERE lokalizatzailea = %s'
    cursor.execute(query, (lok,))
    tokenId = cursor.fetchone()[0]
    bbdd.close()
    return tokenId

def get_emaila(lok):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'SELECT emaila FROM partaideak WHERE lokalizatzailea = %s'
    cursor.execute(query, (lok,))
    emaila = cursor.fetchone()[0]
    bbdd.close()
    return emaila

def get_erabiltzailea(email, password):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = "SELECT id, izena FROM irakasleak WHERE emaila = %s and pasahitza = sha(%s)"
    cursor.execute(query, (email.lower(), password))
    row = cursor.fetchone()
    bbdd.close()
    return row

def get_pasahitza(id):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'SELECT pasahitza FROM irakasleak WHERE id = %s'
    cursor.execute(query, (id,))
    pasahitza = cursor.fetchone()[0]
    bbdd.close()
    return pasahitza

def update_pasahitza(id, pasahitza):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'UPDATE irakasleak SET pasahitza = %s WHERE id = %s'
    cursor.execute(query, (pasahitza, id))
    bbdd.close()
    return None

####################### BLOCKCHAIN #######################
def get_contract():
    random.shuffle(BK_PROVIDER)
    for i in range(len(BK_PROVIDER)):
        provider = BK_PROVIDER[i]+":"+BK_PROVIDER_PORT
        print("Provider: "+provider, flush=True)

        web3 = Web3(Web3.HTTPProvider(provider))
        if web3.is_connected():
            print("SIIIIIIIIIIIIIIIII: "+provider, flush=True)
            break
    
        
    #provider = BK_PROVIDER[0]+":"+BK_PROVIDER_PORT
    #print(provider, flush=True)
    #web3 = Web3(Web3.HTTPProvider(provider))
    #web3.is_connected()
    #web3.middleware_onion.inject(geth_poa_middleware, layer=0)
    web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    contract_address = Web3.to_checksum_address(BK_CONTRACT_ADDRESS)
    with open(BK_ABI_PATH, "r") as f:
            contract_abi = f.read()
    # Instancia del contrato
    contract = web3.eth.contract(address=contract_address, abi=contract_abi)
    return contract, web3

def nft_sortu(uri, text_info):
    contract, web3 = get_contract()

    # Consultamos el nº de tokenId que se le va a asignar al nuevo NFT
    tokenId = contract.functions.getNextTokenId().call()
    # Construir la transacción
    nonce = web3.eth.get_transaction_count(BK_OWNER_ADDRESS)
    txn = contract.functions.safeMint(BK_OWNER_ADDRESS, uri, text_info).build_transaction({
        'chainId': BK_CHAIN_ID,  # ID de la red
        'from': BK_OWNER_ADDRESS,
        'nonce': nonce,
        'maxFeePerGas': 0,
        'maxPriorityFeePerGas': 0,
    })
    # Firmar y enviar la transacción
    signed_txn = web3.eth.account.sign_transaction(txn, private_key=BK_OWNER_PRIVATE)
    txt_hash = web3.eth.send_raw_transaction(signed_txn.raw_transaction)
    web3.eth.wait_for_transaction_receipt(txt_hash)

    return tokenId

def get_nft_info(idfor):
    bbdd = get_db_con()
    cursor = bbdd.cursor()
    query = 'SELECT id, tokenId FROM partaideak WHERE idformakuntza = %s'
    cursor.execute(query, (idfor,))
    partaideak = cursor.fetchall()

    contract = get_contract()[0]
    nfts = {}
    for par in partaideak:
        uri = contract.functions.tokenURI(par[1]).call()
        #txt_info = contract.functions.tokenTextInfo(par[1]).call()
        #nfts[par[0]] = [par[1], uri, txt_info] 
        nfts[par[0]] = [par[1], uri] 
    bbdd.close()
    return nfts

####################### EMAILAK #######################
def bidali_emaila(nori, izena, lokalizatzailea, formakuntza, cert):
    context = ssl.create_default_context() 
    with smtplib.SMTP_SSL(EM_SERVER, EM_PORT, context=context) as server:
        server.login(EM_SENDER, EM_SENDER_PASSWORD)

        ########## EMAILA BIDALI ##########
        message = MIMEMultipart("alternative")
        message["Subject"] = formakuntza + " - Ziurtagiria / Certificado"
        message["From"] = EM_SENDER
        message["To"] = nori
        message["Date"] = formatdate(localtime=True)
        with open("static/mail/email.html", "r") as f:
            mail_html = f.read().replace("{{izena}}", izena).replace("{{email_lok}}", lokalizatzailea).replace("{{formakuntza}}", formakuntza).replace("{{BK_BASE_URI}}", BK_BASE_URI)
        with open("static/mail/email.txt", "r") as f:
            mail_text = f.read().replace("{{izena}}", izena).replace("{{email_lok}}", lokalizatzailea).replace("{{formakuntza}}", formakuntza).replace("{{BK_BASE_URI}}", BK_BASE_URI)
        part1 = MIMEText(mail_text, "plain")
        part2 = MIMEText(mail_html, "html")

        # Add HTML/plain-text parts to MIMEMultipart message
        # The email client will try to render the last part first
        message.attach(part1)
        message.attach(part2)

        # Adjuntar el PDF
        pdf_path = "static/certs/"+cert
        with open(pdf_path, "rb") as f:
            pdf_data = f.read()
        part3 = MIMEApplication(pdf_data, Name=cert)
        part3['Content-Disposition'] = 'attachment; filename='+cert
        message.attach(part3)
        server.sendmail(EM_SENDER, nori, message.as_string())

####################### SESIOAK #######################
def session_check():
    return True if "id" in session else False
    

####################### OROKORRAK #######################
def get_lokalizatzailea(idfor):
    idfor = int(idfor)
    localizador = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    lokalizatzailea = f"{idfor%10000:04d}" + "-" + str(localizador)
    return lokalizatzailea

def sha1_hash_sortu(password):
    sha1 = hashlib.sha1()
    sha1.update(password.encode('utf-8'))
    return sha1.hexdigest()

def pdf_orria_sortu(p, bg_image, width, height, partaidea, formakuntza):
    p.drawImage(bg_image, 0, 0, width=width, height=height)
    p.setFont('CustomFont', 28)
    text = f"{partaidea}"
    text_width = p.stringWidth(text, 'CustomFont', 28)
    x_izena = (width - text_width) / 2
    y_izena = height - 320
    p.drawString(x_izena, y_izena, text)
    p.setFont('CustomFont', 24)
    fizena = f"{formakuntza}"
    text_width = p.stringWidth(fizena, 'CustomFont', 24)
    x_for = (width - text_width) / 2
    y_for = height - 400
    p.drawString(x_for, y_for, fizena)
    p.showPage()


