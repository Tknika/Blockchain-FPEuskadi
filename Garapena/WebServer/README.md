# Servidor web con contenedores Docker

Ejecutamos:

`docker compose -f docker-compose.yml up`

## A tener en cuenta antes de ejecutarlo:

- Revisar parámetros que se mandan como variables de entorno en las aplicaciones web.

- En el fichero docker-compose.yml (en el 'healthcheck' también está) revisar password de la base de datos y de Ethstats.

- Revisar los script de creación de las bases de datos de cada aplicación web por si se quieren modificar los usuarios o contraseñas iniciales.

- Revisar las URL de los ficheros de configuración del nginx (carpeta conf.d) por si se quieren modificar.

## Los servicios que se despliegan

- **ethstats**: el servidor de Ethereum Stats, situado en ../Pilotoak/Erremintak/ethstats. Estará accesible en el servidor accediendo como *ethstats.localhost*.
- **ziurtagiriak**: la aplicación Ziurtagiriak, situada en ../Pilotoak/ZiurtagiriakAPP. Estará accesible en el servidor accediendo como *localhost* ó *ziurtagiriak.localhost*.
- **etiketa**: la aplicación Etiqueta Inteligente, situada en ../Pilotoak/EtiketaAPP. Estará accesible en el servidor accediendo como *etiketa.localhost*.
- **webserver**: el servidor que hace de proxy para acceder a uno u otro servicio dependiendo del nombre con el que hayamos accedido. Escucha en el puerto 80.
- **mariadb**: base de datos MariaDB que necesita la aplicación Ziurtagiriak pero que se podría reutilizar para cualquier otra aplicación que necesite una base de datos.