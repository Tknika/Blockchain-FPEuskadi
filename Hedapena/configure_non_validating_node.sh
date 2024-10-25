#!/bin/bash

# Instalar Java
echo "Instalando Java..."
sudo apt install openjdk-21-jdk-headless

# Instalar ejecutables Besu
echo "Instalando ejecutables Besu..."
wget https://github.com/hyperledger/besu/releases/download/24.10.0/besu-24.10.0.tar.gz
tar -xvzf ./besu-24.10.0.tar.gz
rm ./besu-24.10.0.tar.gz

# Instalar ejecutables Tessera
echo "Instalando ejecutables Tessera..."
wget https://s01.oss.sonatype.org/service/local/repositories/releases/content/net/consensys/quorum/tessera/tessera-dist/24.4.2/tessera-dist-24.4.2.tar
tar -xvf ./tessera-dist-24.4.2.tar
rm ./tessera-dist-24.4.2.tar

# Generar claves Besu
echo "Generando claves Besu..."
rm -r ./networkFiles/keys/
./besu-24.10.0/bin/besu --data-path=./networkFiles/keys public-key export --to=./networkFiles/keys/keyNewNode.pub
# ./besu-24.10.0/bin/besu public-key export-address --node-private-key-file=./networkFiles/keys/keyNewNode --to=./networkFiles/keys/address
mv ./networkFiles/keys/key ./networkFiles/keys/keyNewNode

# Generar claves Tessera
echo "Generando claves Tessera..."
rm -r ./networkFiles/TesseraKeys/
mkdir ./networkFiles/TesseraKeys/
./tessera-24.4.2/bin/tessera -keygen -filename tenantKeyNewNode
mv ./tenantKeyNewNode.* ./networkFiles/TesseraKeys/

#Generar clave privada RSA para el token JWT
echo "Generando clave privada RSA para el token JWT..."
rm -r ./networkFiles/JWTkeys/
mkdir ./networkFiles/JWTkeys/
openssl genrsa -out ./networkFiles/JWTkeys/privateRSAKeyOperator.pem 2048
openssl rsa -pubout -in ./networkFiles/JWTkeys/privateRSAKeyOperator.pem -out ./networkFiles/JWTkeys/publicRSAKeyOperator.pem

# Generar token JWT para el tenant, en princio con todos los permisos
echo "Generando token JWT Tessera..."
PRIVACY_PUBLIC_KEY=$(cat ./networkFiles/TesseraKeys/tenantKeyNewNode.pub | tr -d '\n')
HEADER=$(echo -n '{"alg":"RS256","typ":"JWT"}' | openssl base64 -e -A | tr -d '=' | tr '/+' '_-')
PAYLOAD=$(echo -n '{"permissions":["*:*"],"privacyPublicKey":"'${PRIVACY_PUBLIC_KEY}'","exp":1600899999002}' | openssl base64 -e -A | tr -d '=' | tr '/+' '_-')
SIGNATURE=$(echo -n "${HEADER}.${PAYLOAD}" | openssl dgst -sha256 -sign ./networkFiles/JWTkeys/privateRSAKeyOperator.pem -binary | openssl base64 -e -A | tr -d '=' | tr '/+' '_-')
TOKEN="${HEADER}.${PAYLOAD}.${SIGNATURE}"
echo ${TOKEN} > ./networkFiles/JWTkeys/JWT_NewNode

# Generar una contraseña aleatoria y guardarla en un archivo
echo "Generando contraseña aleatoria..."
openssl rand -base64 15 | tr -d '\n' > ./networkFiles/TesseraKeys/db_password
echo "Contraseña aleatoria generada y guardada en ./networkFiles/TesseraKeys/db_password"

# Eliminar carpetas
rm -r ./besu-24.10.0
rm -r ./tessera-24.4.2

# Mensaje con la clave pública del nuevo nodo
echo "Clave pública del nuevo nodo:"
cat ./networkFiles/keys/keyNewNode.pub
echo ""
echo "Hay que proporcionar esta clave junto con la IP pública del nodo a los administradores de la red para que puedan agregar el nodo."
echo "Ejecuta el siguiente comando para arrancar el nodo:"
echo "docker compose -f docker-composeNewNode.yml up"


