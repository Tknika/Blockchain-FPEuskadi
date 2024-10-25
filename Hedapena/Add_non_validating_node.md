# Añadir nodos no validadores a la red

Si un nodo quiere unirse a la red, debe utilizar las claves que le proporcionemos.

Se proporciona para el nodo Besu una clave pública y una privada, además de una dirección Ethereum. Para Tessera se proporciona una clave pública y una privada.

## Administrador del nuevo nodo

El administrador del nuevo nodo tiene que:
- Clonar el repositorio.
- Ejecutar el script **configure_non_validating_node.sh** para generar las claves y configuraciones necesarias.
- Ejecutar `docker compose -f docker-composeNewNode.yml up`

Si todo va bien, el nuevo nodo se conectará a la red y se sincronizará.


## Administrador de la red Blockchain

Primero necesita obtener el e-node del nuevo nodo.

Deberá añadirlo al fichero **nodes_permissions_config.toml** en todos los nodos que forman la red (para que si hay un reinicio de la red, el nuevo nodo pueda conectarse a ella).

Deberá hacer uso de la API PERM para indicar a todos los nodos, mientras están en marcha, que el nuevo nodo puede conectarse con ellos. Esto se puede hacer así:
`websocat -H="Authorization: Bearer TOKEN_JWT" ws://IP_NODO:8546`
`{"jsonrpc":"2.0","method":"perm_addNodesToAllowlist","params":[["enode://CLAVE_PUBLICA_NUEVO_NODO@IP_NUEVO_NODO:30303"]], "id":1}`
Si hay ido bien recibiremos un Success: *{"jsonrpc":"2.0","id":1,"result":"Success"}*
Esto habrá que hacerlo para todos los nodos en los que permitiremos que se conecte el nuevo nodo.
Para comprobar que se ha añadido correctamente, se puede ejecutar:
`{"jsonrpc":"2.0","method":"perm_getNodesAllowlist","params":[], "id":1}`