# Despliegue

Pasos a seguir para desplegar Hyperledger Besu en X máquinas físicas distintas (ejemplo del repositorio hecho para 4 máquinas) cada una con su propia IP pública distinta.

## 1.- Software necesario

### 1.1.- Todas las máquinas
- Ubuntu Server actualizado.
- [Docker instalado](https://docs.docker.com/engine/install/ubuntu/).

### 1.2.- Máquina principal (la que despliega)
- Java:

`sudo apt install openjdk-19-jdk-headless`

- Hyperledger Besu:

`wget https://hyperledger.jfrog.io/artifactory/besu-binaries/besu/23.10.2/besu-23.10.2.tar.gz`

`tar -xvzf ./besu-23.10.2.tar.gz`

- Node.js:

`wget https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz`

`tar -xvf ./node-v20.10.0-linux-x64.tar.xz`

Añadir esto al fichero *.profile* del usuario Linux para que se incluyan los binarios en el PATH:

> 
	if [ -d "$HOME/node-v20.10.0-linux-x64/bin" ] ; then
  		PATH="$PATH:$HOME/node-v20.10.0-linux-x64/bin"
	fi
	if [ -d "$HOME/besu-23.10.2/bin" ] ; then
  		PATH="$PATH:$HOME/besu-23.10.2/bin"
	fi


Aplicar esos cambios con `source .profile`

## 2.- Configuración inicial

### 2.1.- Docker swarm y red virtual

Asegurarnos de que al menos 4 nodos están en una red docker swarm.
- `docker swarm init --advertise-addr IP-PÚBLICA-NODO-PRINCIPAL`  (en el nodo principal)
- `docker swarm join-token manager` (en el nodo principal, obtener token de manager)
- `docker swarm join --token SWMTKN-1-… --advertise-addr IP-PÚBLICA-NODO-ACTUAL IP-PÚBLICA-NODO-PRINCIPAL:2377` (en los demás nodos)

Asegurarnos de que tenemos la red docker creada:
- docker network create --attachable --subnet 172.16.0.0/24 --driver overlay besu_network

### 2.2.- Ficheros de configuración

En cada servidor se puede crear una carpeta llamada *QBFT-Network* por ejemplo y copiar todos los ficheros de este repositorio para utilizar como configuración base. Esta configuración es válida tal y como está pero se recomienda ajustar los parámetros (número de nodos, tiempo entre bloques...) y regenerar el *genesis.json* con nuevas direcciones.

#### 2.2.1.- Generar nuevas direcciones

Con Besu instalado podemos tantas crear nuevas direcciones como queramos para asignarles una cantidad de ETH inicial en el génesis. Podemos hacerlo con estos comandos:

`besu --data-path=./address1 public-key export --to=./address1/key.pub`

`besu --data-path=./address1 public-key export-address --to=./address1/address`

#### 2.2.2.- Generar genesis.json y claves de nodos

Tras configurar **qbftConfigFile.json** como queramos ejecutamos:

`besu operator generate-blockchain-config --config-file=qbftConfigFile.json --to=networkFiles --private-key-file-name=key`

Esto nos genera la carpeta *networkFiles* con *genesis.json* y las direcciones de los nodos con sus claves dentro.

#### 2.2.3.- Configuración de los nodos

En la carpeta *configNodes* está el fichero **config-node.toml** (en este caso común para todos) donde se configuran parámetros del nodo.

Hay que modificar el apartado *bootnodes=* con las direcciones enode que correspondan a los validadores (con la clave pública + IP:puerto). También vamos a crear el fichero *networkFiles/static-nodes.json* y poner esos mismos enodes.

Lo configurado hasta ahora es válido para todos los nodos pero **cada nodo** tiene que tener su fichero **docker-composeX.yml** bien configurado y en la carpeta */Node/data* de cada nodo tenemos que copiar sus **ficheros key y key.pub de la carpeta networkFiles** (donde se han generado).

## 3.- Despliegue blockchain

### 3.1.- Nodos validadores

Una vez copiada la configuración a cada nodo basta con ejecutar:

`docker compose -f docker-composeX.yml up`

donde X es el número de nodo en el que nos encontramos. Tras ejecutarlo en todos los nodos el blockchain debería comenzar a crear bloques.

### 3.2.- Monitorización / Chainlens

En el nodo donde queramos desplegar el servicio de monitorización bastará con ir a Services/config/chainlens-free/ y ejecutar:

`docker compose -f docker-composeX.yml up`

donde X es el número de nodo donde vamos a desplegarlo. El ejemplo está hecho para el nodo 2, que se tiene que llamar 'besu_node**2**'. Hay que adaptar ese fichero y el nginx**2**.conf siguiendo el ejemplo hecho para el nodo 2. Solamente habría que sustituir el sufijo 2 por el del número de nodo en los contenidos de los ficheros.

La aplicación de monitorización estará accesible en el **puerto 80** del nodo. Podemos visualizarlo desde el navegador de otra máquina ejecutando este comando en un terminal y acceciendo después en el navegador a `localhost:8080`:

`ssh -p 22222 -N -L 8080:localhost:80 tknika@IP-PÚBLICA-NODO`

La aplicación de monitorización también estará accesible en el servidor web si lo hemos levantado con Docker, bastará con acceder con el hostmane indicado en los ficheros Chainlens**X**.conf del sevidor.


## 4.- Despliegue smart-contract

Para desplegar un smart-contract en la red que hemos creado basta con ir a la máquina de uno de los nodos validadores y seguir los pasos indicados en el [apartado Hardhat](https://github.com/Tknika/Blockchain-FPEuskadi/tree/main/Garapena/Hardhat).

## 5.- Servidor web

### Sin Docker
Si queremos que un (nuevo) nodo haga de servidor web que ofrezca apliaciones que se comuniquen con el blockchain, basta con seguir los pasos descritos en [este documento](https://github.com/Tknika/Blockchain-FPEuskadi/tree/main/Garapena/Pilotoak/Instalacion_servidor_web_sin_docker.md).

### Con Docker
Introducimos un nuevo servidor en la red Docker Swarm, clonamos este repositorio y ejecutamos el fichero de docker compose de la [carpeta WebServer](https://github.com/Tknika/Blockchain-FPEuskadi/tree/main/Garapena/WebServer).
