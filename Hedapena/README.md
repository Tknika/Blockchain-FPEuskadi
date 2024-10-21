# Despliegue

Pasos a seguir para desplegar Hyperledger Besu en X máquinas físicas distintas (ejemplo del repositorio hecho para 4 máquinas) cada una con su propia IP pública distinta.

Se puede saltar al apartado 3 si se quiere probar la configuración por defecto (preparado para 4 nodos Besu + Tessera y un servidor web, siendo las IPs de los nodos 192.168.100.1, 192.168.100.2, 192.168.100.3 y 192.168.100.4).

## 1.- Software necesario

### 1.1.- Todas las máquinas
- Ubuntu Server actualizado.
- [Docker instalado](https://docs.docker.com/engine/install/ubuntu/).

### 1.2.- Máquina principal (la que despliega)
- Java:

`sudo apt install openjdk-21-jdk-headless`

- Hyperledger Besu:

`wget https://github.com/hyperledger/besu/releases/download/24.10.0/besu-24.10.0.tar.gz`

`tar -xvzf ./besu-24.10.0.tar.gz`

- Node.js:

`wget https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz`

`tar -xvf ./node-v20.10.0-linux-x64.tar.xz`

- Tessera:

`wget https://s01.oss.sonatype.org/service/local/repositories/releases/content/net/consensys/quorum/tessera/tessera-dist/24.4.2/tessera-dist-24.4.2.tar`

`tar -xvf ./tessera-dist-24.4.2.tar`

Añadir esto al fichero *.profile* del usuario Linux para que se incluyan los binarios en el PATH:

> 
	if [ -d "$HOME/node-v20.10.0-linux-x64/bin" ] ; then
  		PATH="$PATH:$HOME/node-v20.10.0-linux-x64/bin"
	fi
	if [ -d "$HOME/besu-24.10.0/bin" ] ; then
  		PATH="$PATH:$HOME/besu-24.10.0/bin"
	fi
	if [ -d "$HOME/tessera-24.4.2/bin" ] ; then
  		PATH="$PATH:$HOME/tessera-24.4.2/bin"
	fi


Aplicar esos cambios con `source .profile`

## 2.- Configuración inicial

### 2.1.- Ficheros de configuración

La configuración proporcionada en este repositorio es válida tal y como está pero se recomienda ajustar los parámetros (número de nodos, tiempo entre bloques...) y regenerar el *genesis.json* con nuevas direcciones.

#### 2.1.1.- Generar nuevas direcciones

Con Besu instalado podemos tantas crear nuevas direcciones como queramos para asignarles una cantidad de ETH inicial en el génesis. Podemos hacerlo con estos comandos:

`besu --data-path=./address1 public-key export --to=./address1/key.pub`

`besu --data-path=./address1 public-key export-address --to=./address1/address`

#### 2.1.2.- Generar genesis.json y claves de nodos

Tras configurar **qbftConfigFile.json** como queramos ejecutamos:

`besu operator generate-blockchain-config --config-file=qbftConfigFile.json --to=networkFiles --private-key-file-name=key`

Esto nos genera la carpeta *networkFiles* con *genesis.json* y las direcciones de los nodos con sus claves dentro. Estas claves privadas las vamos a copiar a la carpeta padre como keyX (tal y como se ve en este repositorio como ejemplo) para que se referencien desde el docker-composeX.yml de cada nodo sin tener que poner la ruta con la carpeta que tiene como nombre la dirección asociada.

Para generar las claves de los 'tenant' Tessera (usuarios que pueden hacer sus propias transacciones privadas) podemos utilizar el siguiente comando:

`tessera -keygen -filename tenantKeyX`

En el repositorio actual se proporcionan las claves de cuatro nodos (en producción habría que recrearlos), están en la carpeta TesseraKeys. Estas claves están referenciadas en el fichero tessera.conf (se ha hecho uno común para todos para simplificar).

#### 2.1.3.- Configuración de los nodos

En la carpeta *configNodes* está el fichero **config-node.toml** (en este caso común para todos) donde se configuran parámetros del nodo. Además hay una serie de ficheros de configuración a los que se hace referencia en el mismo y hay que modificar:

- En el fichero *networkFiles/static-nodes.json* las direcciones enode que correspondan a los validadores (con la clave pública + IP:puerto). **Hay que poner las IP públicas de cada nodo.**

- En el fichero *networkFiles/nodes_permissions_config.toml* incluir los nodos a los que se permite conectar. **Hay que poner las IP públicas de cada nodo.**

- En el fichero *networkFiles/accounts_permissions_config.toml* incluir las cuentas (direcciones) a las que se permite operar. Vamos a incluir las direcciones de cada nodo, las direcciones configuradas en el génesis y las direcciones asociadas a las claves privadas que van a desplegar contratos en la red.

Lo configurado hasta ahora es válido para todos los nodos pero **cada nodo** tiene que tener su fichero **docker-composeX.yml** bien configurado para que reciba la ruta apropiada a su **clave privada keyX de la carpeta networkFiles/keys**.

En la carpeta *configNodes* también está el fichero **tessera.conf** que hay que adaptar para configurar los demás nodos Tessera con los que se comunica y la ubicación de las claves de los 'tenants'. **Hay que poner las IP públicas de cada nodo.**

### 2.2.- Autenticación: generar tokens JWT

Necesitaremos autenticarnos mediante tokens JWT si queremos acceder a las API administrativas de los nodos o queremos hacer transacciones privadas mediante tenants (todo ello mediante el protocolo ws). Para ello lo primero es crear un par de claves público-privada mediante los siguientes comandos:

`openssl genrsa -out privateRSAKeyOperator.pem 2048`

`openssl rsa -pubout -in privateRSAKeyOperator.pem -out publicRSAKeyOperator.pem`

Estos ficheros deben situarse en la carpeta **networkFiles/JWTkeys** y se llamarán **privateRSAKeyOperator.pem** y **publicRSAKeyOperator.pem**.

Para generar los tokens JWT ejecutamos el script *createJWT.py* de la carpeta *Pilotoak/Erremintak/*. También podemos utilizar la herramienta [jwt.io](https://jwt.io/) para generar los tokens JWT.

## 3.- Despliegue blockchain

### 3.1.- Nodos validadores

Una vez copiada la configuración a cada nodo basta con ejecutar:

`docker compose -f docker-composeX.yml up`

donde X es el número de nodo en el que nos encontramos. Tras ejecutarlo en todos los nodos el blockchain debería comenzar a crear bloques.

### 3.2.- Nodos NO validadores

Si queremos que un nuevo **no validador** se una a la red, hay que seguir los pasos descritos en [este documento](https://github.com/Tknika/Blockchain-FPEuskadi/tree/main/Hedapena/Add_non_validating_node.md).

### 3.3.- Monitorización / Chainlens

En el nodo donde queramos desplegar el servicio de monitorización bastará con ir a Services/config/chainlens-free/ y ejecutar:

`docker compose -f docker-composeX.yml up`

donde X es el número de nodo donde vamos a desplegarlo.

La aplicación de monitorización estará accesible en el **puerto 80** del nodo. Podemos visualizarlo desde el navegador de otra máquina ejecutando este comando en un terminal y acceciendo después en el navegador a `localhost:8080`:

`ssh -p 22222 -N -L 8080:localhost:80 tknika@IP-PÚBLICA-NODO`

La aplicación de monitorización también estará accesible en el servidor web si lo hemos levantado con Docker, bastará con acceder con el hostmane indicado en los ficheros Chainlens**X**.conf del sevidor.


## 4.- Despliegue smart-contract

Para desplegar un smart-contract en la red que hemos creado basta con ir a la máquina de uno de los nodos validadores y seguir los pasos indicados en el [apartado Hardhat](https://github.com/Tknika/Blockchain-FPEuskadi/tree/main/Garapena/Hardhat).

## 5.- Servidor web

### Sin Docker
Si queremos que un (nuevo) nodo haga de servidor web que ofrezca apliaciones que se comuniquen con el blockchain, basta con seguir los pasos descritos en [este documento](https://github.com/Tknika/Blockchain-FPEuskadi/tree/main/Garapena/Pilotoak/Instalacion_servidor_web_sin_docker.md).

### Con Docker
En un servidor clonamos este repositorio y ejecutamos el fichero de docker compose de la [carpeta WebServer](https://github.com/Tknika/Blockchain-FPEuskadi/tree/main/Garapena/WebServer).

**Cambiar/adaptar las IPs de los ficheros .env de la carpeta WebServer**

## 6.- Herramienta para operar con la API

Como hemos activado autenticación en el protocolo ws (WebSocket) y por seguridad algunos grupos de API solamente están accesibles mediante el mismo, una herramienta útil para operar desde la línea de comandos puede ser [websocat](https://github.com/vi/websocat).

Descargamos el binario del repositorio, le damos permisos de ejecución y con un token JWT válido ejecutamos:

`websocat -H="Authorization: Bearer TOKEN_JWT" ws://localhost:8546`

Se conectará y quedará a la espera de comandos. Por ejemplo podemos consultar los nodos que tienen permiso para operar:

`{"jsonrpc":"2.0","method":"perm_getNodesAllowlist","params":[], "id":1}`

O las cuentas autorizadas para operar:

`{"jsonrpc":"2.0","method":"perm_getAccountsAllowlist","params":[], "id":1}`

Si la lista está vacía o queremos añadir nuevas cuentas:

`{"jsonrpc":"2.0","method":"perm_addAccountsToAllowlist","params":[["0x867e3DCc2E546AB8d62aB8B25E6800C328ca2DD8","0x89b84B7FA93E429F2ce4632505074eED74E89351","0x92C83b4052230b836E100C42701cDc83d7baEb8a","0xC6261C951d52b563d6a91afB774Db1c2516CaAC4","0x432132E8561785c33Afe931762cf8EEb9c80E3aD","0xcB88953e60948E3A76FA658d65b7c2d5043c6409","0xDd76406B124f9E3AE9fBeb47e4d8Dc0ab143902D"]], "id":1}`


