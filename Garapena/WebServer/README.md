# Servidor web con contenedores Docker

Basta con que la máquina que vaya a hacer de servidor web esté dentro de la red Docker Swarm donde están los demás nodos. Ejecutamos:

`docker compose -f docker-compose.yml up`

## A tener en cuenta antes de ejecutarlo:

- Revisar la dirección del contrato y la clave privada que se mandan como variables de entorno en la apliación web.

## Los servicios que se despliegan
- **ziurtagiriak**: la aplicación Ziurtagiriak, situada en ../Pilotoak/ZiurtagiriakAPP. Estará accesible en el servidor accediendo como *localhost* ó *ziurtagiriak.localhost*.
- **etiketa**: la aplicación Etiqueta Inteligente, situada en ../Pilotoak/EtiketaAPP. Estará accesible en el servidor accediendo como *etiketa.localhost*.
- **webserver**: el servidor que hace de proxy para acceder a uno u otro servicio dependiendo del nombre con el que hayamos accedido. Escucha en el puerto 80.
- **db**: base de datos MariaDB que necesita la aplicación Ziurtagiriak pero que se podría reutilizar para cualquier otra aplicación que necesite una base de datos.