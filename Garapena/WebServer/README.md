# Servidor web con contenedores Docker

Basta con que la máquina que vaya a hacer de servidor web esté dentro de la red Docker Swarm donde están los demás nodos. Ejecutamos:

`docker compose -f docker-compose.yml up`

## A tener en cuenta antes de ejecutarlo:

- Revisar la dirección del contrato y la clave privada que se mandan como variables de entorno en la apliación web.
- Comprobar si hay más o menos nodos ejecutando la monitorización Chainlens para renombrar o eliminar ficheros .conf de la carpeta ./nginx/conf.d

## Los servicios que se despliegan
- **web**: la aplicación Ziurtagiriak, situada en ../Pilotoak/ZiurtagiriakAPP. Estará accesible en el servidor accediendo como *localhost* ó *ziurtagiriak.localhost*.
- **nginx**: el servidor que hace de proxy para acceder a uno u otro servicio dependiendo del nombre con el que hayamos accedido. Escucha en el puerto 80.
- **db**: base de datos MariaDB que necesita la aplicación Ziurtagiriak pero que se podría reutilizar para cualquier otra aplicación que necesite una base de datos.