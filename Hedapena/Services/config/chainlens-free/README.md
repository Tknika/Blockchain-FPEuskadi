Servicio de Chainlens-free que soporta la versión 23.10 de Besu.

Modificado para que se pueda instalar en cada nodo del docker swarm cambiando el sufijo (ejemplos hechos para nodos 1-4). Cada uno de ellos está configurado para que monitorice el nodo de nombre 'besu_node**X**'.

Para poder visualizarlo, el servicio está accesible por web en el puerto 80 de la máquina donde se haya levantado. Si queremos poder visualizar Chainlens también desde el servidor web, tenemos que asegurarnos de que Chainles**X**.conf está en el servidor web. Es decir, si en un nodo desplegamos el docker-compose2.yml de esta carpeta, en el servidor web debería estar el fichero nginx/conf.d/Chainlens2.conf

La funcionalidad de ver contratos de NFTs no está disponible en la versión gratuita.
