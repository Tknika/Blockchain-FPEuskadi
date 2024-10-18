# Añadir nodos no validadores a la red

Si un nodo quiere unirse a la red, debe utilizar las claves que le proporcionemos.

Se proporciona para el nodo Besu una clave pública y una privada, además de una dirección Ethereum. Para Tessera se proporciona una clave pública y una privada.

## Administrador de la red Blockchain

Un administrador de la red ejecutará los siguientes comandos para generarlos:

`besu --data-path=./clavesNuevoNodo public-key export --to=./clavesNuevoNodo/key.pub`

`besu --data-path=./clavesNuevoNodo public-key export-address --to=./clavesNuevoNodo/address` 

En la carpeta **clavesNuevoNodo** se habrán creado tres ficheros: **key.pub**, **key** y **address**.

`tessera -keygen -filename tenantKeyNewNode`

Se habrán creado los ficheros: **tenantKeyNewNode.pub** y **tenantKeyNewNode.key**.

Estos ficheros serán los que se proporcionen al administrador del nuevo nodo.

Deberá añadir la clave pública (con su IP y puerto) al fichero **nodes_permissions_config.toml** en todos los nodos que forman la red (para que si hay un reinicio de la red, el nuevo nodo pueda conectarse a ella). **Este fichero actualizado hay que proporcionárselo al administrador del nuevo nodo.**

Deberá hacer uso de la API PERM para indicar a los demás nodos, mientras están en marcha, que el nuevo nodo puede conectarse con ellos. Esto se puede hacer así:
`websocat -H="Authorization: Bearer TOKEN_JWT" ws://IP_NODO:8546`
`{"jsonrpc":"2.0","method":"perm_addNodesToAllowlist","params":[["enode://CLAVE_PUBLICA_NUEVO_NODO@IP_NUEVO_NODO:30303"]], "id":1}`
Si hay ido bien recibiremos un Success: *{"jsonrpc":"2.0","id":1,"result":"Success"}*
Esto habrá que hacerlo para todos los nodos en los que permitiremos que se conecte el nuevo nodo.
Para comprobar que se ha añadido correctamente, se puede ejecutar:
`{"jsonrpc":"2.0","method":"perm_getNodesAllowlist","params":[], "id":1}`


## Administrador del nuevo nodo

El administrador del nuevo nodo tiene que:
- Clonar el repositorio.
- Sustituir el fichero **nodes_permissions_config.toml** con el contenido del fichero que le proporcionemos los administradores de la red.
- Incorporar las claves proporcionadas:
    - **key** en el fichero **networkFiles/keys/keyNewNode**
    - **tenantKeyNewNode.pub** en el fichero **networkFiles/TesseraKeys/tenantKeyNewNode.pub**
    - **tenantKeyNewNode.key** en el fichero **networkFiles/TesseraKeys/tenantKeyNewNode.key**
- Si quiere hacer transacciones privadas con otro nodo, indicarlo en el apartado **peer** del fichero **configNodes/tesseraNewNode.conf**. También tendrá que generar tokens JWT para ello si no ha modificado el fichero de configuración del nodo, *node-config.toml*.
- Ejecutar `docker compose -f docker-composeNewNode.yml up`

Si todo va bien, el nuevo nodo se conectará a la red y se sincronizará.

