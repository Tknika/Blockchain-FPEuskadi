# Servidor web con contenedores Docker

Ejecutamos:

`docker compose -f docker-compose.yml up`

## A tener en cuenta antes de ejecutarlo:

- Revisar parámetros que se mandan como variables de entorno en las aplicaciones web.

- En el fichero docker-compose.yml (en el 'healthcheck' también está) revisar password de la base de datos y de Ethstats.

- Revisar los script de creación de las bases de datos de cada aplicación web por si se quieren modificar los usuarios o contraseñas iniciales.

- Revisar las URL de los ficheros de configuración del nginx (carpeta *conf.d*) por si se quieren modificar. En principio, *default.conf* y los ficheros *\*_SSL.conf* están configurados para utilizar certificados y acceder de manera segura en un entorno de producción. Para desarrollo utilizar las configuraciones de la carpeta *nginx/conf.d/garapena* (basta con modificar la ruta en el fichero *nginx.conf*).

## Los servicios que se despliegan

- **ethstats**: el servidor de Ethereum Stats, situado en ../Pilotoak/Erremintak/ethstats. Estará accesible en el servidor accediendo al puerto definido en el fichero *docker-compose.yml*.
- **mailserver**: el servidor de correo electrónico. Estará accesible en el servidor accediendo a los puertos definidos en el fichero *docker-compose.yml*.
- **ziurtagiriak**: la aplicación Ziurtagiriak, situada en ../Pilotoak/ZiurtagiriakAPP. Estará accesible en el servidor accediendo con los nombres configurados en los ficheros de la carpeta *nginx/conf.d/*.
- **etiketa**: la aplicación Etiqueta Inteligente, situada en ../Pilotoak/EtiketaAPP. Estará accesible en el servidor accediendo con los nombres configurados en los ficheros de la carpeta *nginx/conf.d/*.
- **formakuntza**: la aplicación Formakuntza, situada en ../Pilotoak/FormakuntzakAPP. Estará accesible en el servidor accediendo con los nombres configurados en los ficheros de la carpeta *nginx/conf.d/*.
- **webserver**: el servidor que hace de proxy para acceder a uno u otro servicio dependiendo del nombre con el que hayamos accedido. Escucha en el puerto 80.
- **mariadb**: base de datos MariaDB que necesita la aplicación Ziurtagiriak pero que se podría reutilizar para cualquier otra aplicación que necesite una base de datos.