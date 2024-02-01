/static/fontawesome/svgs karpeta falta da Fontawesome libreriatik

# Instalación de la aplicación
## Instalación de MariaDB
La aplicación utiliza una BBDD MariaDB, para ello habrá que instalarla en el sistema:
```
apt install mariadb-server
```
Tras la instalación, procedemos a habilitar el servicio al arranque y lo iniciamos:
```
systemctl start mariadb
systemctl enable mariadb
```
### Configurar MariaDB
Ahora que ya tenemos el servicio levantado, tocará aplicar un poco de configuración, para ello ejecutaremos el comando mysql_secure_installation para configurarlo de la siguiente manera:
```
sudo mysql_secure_installation
```
Seguiremos los siguientes pasos:
```
Enter current password for root (enter for none): Enter
Set root password? [Y/n] Y
Remove anonymous users? [Y/n] Y
Disallow root login remotely? [Y/n] Y
Remove test database and access to it? [Y/n] Y
Reload privilege tables now? [Y/n] Y
```
¡Y listo! Ya tenemos MariaDB instalado y configurado correctamente.

### Crear un usuario y BBDD para la aplicación
Lo primero conectar con el motor de BBDD, con un usuario con privilegios para crear otros usuario y bases de datos, suele ser el usuario root:
```
mysql -u root -p
(pedirá la clave).
```
Una vez dentro a mi me gusta ver las bases de datos:
```
show databases;
```
Para crear el usuario:
```
CREATE USER 'blockchain'@'localhost' IDENTIFIED VIA mysql_native_password;
```
Ahora le establecemos una password:
```
SET PASSWORD FOR 'blockchain'@'localhost' = PASSWORD('blockchain');
```
Creamos la base de datos:
```
CREATE DATABASE IF NOT EXISTS `blockchain`;
```
Le damos todos los privilegios sobre esta base de datos al usuario recién creado:
```
GRANT ALL PRIVILEGES ON `blockchain`.* TO 'blockchain'@'localhost';
```

### Importación de la BBDD
Vamos a importar la estructura y los datos a la BBDD desde la copia de seguridad. Para ello tenemos en el proyecto el fichero [blockchain-dump.sql](blockchain-dump.sql)
Ejecutamos el siguiente comando (desde la carpeta en la que está el archivo blockchain-dump.sql o pondremos la ruta hasta el archivo):
```
mysql -u blockchain -p blockchain < blockchain-dump.sql
(Ten en cuenta donde estás y la ruta hasta el archivo con el volcado de la BBDD)
(pedirá la clave)
```

## Instalación de librerías de Python necesarias
La aplicación necesita de las librerías web3, mysql.connector,...
Para instalarlas hay que ejecutar lo siguiente (**con el entorno virtual de la aplicación activado**):
```
source venv/bin/activate
pip install web3 mysql-connector
