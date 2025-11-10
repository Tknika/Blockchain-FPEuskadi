# Añadir nuevos nodos a la red

## Administrador del nuevo nodo

El administrador del nuevo nodo tiene que:
- Clonar el repositorio:
  - `git clone https://github.com/Tknika/Blockchain-FPEuskadi.git`
- Ejecutar el script **configure_new_node.sh** para instalar Java y Docker y generar las claves y configuraciones necesarias:
  - `cd Blockchain-FPEuskadi/Hedapena`
  - `sh ./configure_new_node.sh`
- Entregar el fichero *información_importante.txt* que se ha generado a los administradores de la red BFPE.
- Sustituir los ficheros *networkFiles/genesis.json*, *networkFiles/static-nodes.json* y *networkFiles/nodes_permissions_config.toml* proporcionados por los administradores de la red BFPE.
- Ejecutar `sudo docker-compose -f docker-composeNewNode.yml up`.

Si todo va bien, el nuevo nodo se conectará a la red y se sincronizará.


## Administrador de la red Blockchain

Primero necesita obtener el e-node del nuevo nodo (en el fichero *información_importante.txt*).

Deberá añadirlo al fichero **nodes_permissions_config.toml** en todos los nodos que forman la red (para que si hay un reinicio de la red, el nuevo nodo pueda conectarse a ella).

Entregar los ficheros *networkFiles/genesis.json*, *networkFiles/static-nodes.json* y *networkFiles/nodes_permissions_config.toml* a los administradores del nuevo nodo para que los sustituyan.

Si no se reinician los nodos (para actualizar el contenido de *nodes_permissions_config.toml*) se deberá hacer uso de la API PERM para indicar a todos los nodos, mientras están en marcha, que el nuevo nodo puede conectarse con ellos. Esto se puede hacer así:
`websocat -H="Authorization: Bearer TOKEN_JWT" ws://IP_NODO:8546`
`{"jsonrpc":"2.0","method":"perm_addNodesToAllowlist","params":[["enode://CLAVE_PUBLICA_NUEVO_NODO@IP_NUEVO_NODO:30303"]], "id":1}`
Si hay ido bien recibiremos un Success: *{"jsonrpc":"2.0","id":1,"result":"Success"}*
Esto habrá que hacerlo para todos los nodos en los que permitiremos que se conecte el nuevo nodo.
Para comprobar que se ha añadido correctamente, se puede ejecutar:
`{"jsonrpc":"2.0","method":"perm_getNodesAllowlist","params":[], "id":1}`

### Hacer que el nodo sea validador (opcional)

Si queremos que el nuevo nodo pase a formar parte de los nodos validadores, tenemos que ejecutar el comando administrativo que lo permita en al menos la mitad más uno de los nodos que ya son validadores. Como es un comando administrativo hay que hacerlo con un token JWT de un *tenant* de ese nodo que tenga permisos administrativos. Utilizando la herramienta *websocat* en cada nodo:
- `websocat -H="Authorization: Bearer TOKEN_JWT" ws://localhost:8546`
- `{"jsonrpc":"2.0","method":"qbft_proposeValidatorVote","params":["ADDRESS_NUEVO_NODO", true], "id":1}`

El *addess* del nuevo nodo hay que escribirlo sin 0x delante, viene en el fichero *informacion_importante.txt*.