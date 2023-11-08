# Instalación del servidor web

[Cómo desplegar una aplicación de Python en Debian 10](https://help.clouding.io/hc/es/articles/360021332399-C%C3%B3mo-desplegar-una-aplicaci%C3%B3n-de-Python-en-Debian-10)

## Instalamos las dependencias necesarias
Necesitamos intalar las siguientes librerías en el sistema _python3-pip libssl-dev libffi-dev python3-dev build-essential python3-setuptools_
```
sudo apt install python3-pip libssl-dev libffi-dev python3-dev build-essential python3-setuptools -y 
```
Una vez todos los paquetes estén instalados, instala un paquete de entorno virtual de Python con el siguiente comando: 
```
sudo apt install python3-venv -y
```
Para continuar, actualiza el PIP a la última versión con el siguiente comando:
```
sudo pip3 install --upgrade pip
```
También necesitarás instalar el servidor web Nginx para servir la aplicación Python. Puedes hacerlo usando el siguiente comando:
```
sudo apt install nginx -y
```

## Crea una aplicación Python
En esta sección, instalaremos Flask y crearemos una aplicación Python.

Primero, crea un directorio para tu aplicación usando este comando:
```
# mkdir ~/nombre_carpeta
```
A continuación, cambia el directorio a tu aplicación y crea un entorno virtual de Python. Mediante el entorno virtual puedes instalar librerías que solo afectarán a tu aplicación y no a todo el sistema. De alguna forma estamos aislando las necesidades de nuestra aplicación de las que pueda tener nuestro sistema:
```
# cd ~/nombre_carpeta
# python3 -m venv venv
```
Después, activa el entorno virtual con el comando que ves a continuación:
```
# source venv/bin/activate
```
Para seguir, instala Flask y Gunicorn con el siguiente comando:
```
# pip install wheel
# pip install gunicorn flask
```
Ahora crea la aplicación Python. En nuestro caso la aplicación Flask se va a crear en un fichero llamado server.py **Esto es importante para la configuración de Gunicorn y la posterior creación de los servicios para las aplicaciones**

## Configura Gunicorn para ejecutar tu aplicación
Con el entorno virtual de la aplicación activado sigue los siguientes pasos:
Primero, crea un archivo wsgi.py:
```
nano ~/ruta_nuestra_aplicación/wsgi.py
```
Añade las siguientes líneas:
```
from server import app
if __name__ == "__main__":
   app.run()
```
Guarda y cierra el archivo y luego ejecuta tu aplicación con Gunicorn:
```
cd ~/ruta_nuestra_aplicación/
gunicorn --bind 0.0.0.0:5000 wsgi:app
```
Deberías obtener un resultado similar a este:
```
(venv) root@debian10:~/flaskapp# gunicorn --bind 0.0.0.0:5000 wsgi:app
[2021-04-21 07:25:03 +0000] [8483] [INFO] Starting gunicorn 20.1.0
[2021-04-21 07:25:03 +0000] [8483] [INFO] Listening at: http://0.0.0.0:5000 (8483)
[2021-04-21 07:25:03 +0000] [8483] [INFO] Using worker: sync
[2021-04-21 07:25:03 +0000] [8486] [INFO] Booting worker with pid: 8486
Presiona "CTRL+C" para parar la aplicación. 
```
A continuación, desactiva tu entorno virtual Python con el siguiente comando: 
```
deactivate
```
## Crea un servicio de ficheros Systemd para tu aplicación Python
Para continuar, deberás crear un archivo de servicio systemd para administrar la aplicación Python.
**En el ejemplo el servicio se llamará flaskapp.service pero se puede cambiar sin problema**
Puedes crearlo con el siguiente comando:
```
sudo nano /etc/systemd/system/flaskapp.service
```
Añade las siguientes líneas:
```
[Unit]
Description=Gunicorn instance to serve Flask
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/ruta_aplicacion
Environment="PATH=/ruta_aplicacion/venv/bin"
ExecStart=/ruta_aplicacion/venv/bin/gunicorn --bind 0.0.0.0:5000 wsgi:app

[Install]
WantedBy=multi-user.target
```
Guarda y cierra el archivo y después establece la propiedad y permisos adecuados con el este comando:
```
sudo chown -R root:www-data /root/flaskapp
sudo chmod -R 775 /root/flaskapp
```
Para seguir, recarga el demonio systemd con el siguiente comando: 
```
sudo systemctl daemon-reload
```
Después, inicia el servicio de flask y habilítelo para que se inicie al reiniciar el sistema:
```
sudo systemctl start flaskapp
sudo systemctl enable flaskapp
```
A continuación, verifica el estado de flask con el siguiente comando:
```
systemctl status flaskapp
```
Deberías ver el resultado que te mostramos aquí:
```
● flaskapp.service - Gunicorn instance to serve Flask
   Loaded: loaded (/etc/systemd/system/flaskapp.service; disabled; vendor preset: enabled)
   Active: active (running) since Wed 2021-04-21 07:25:51 UTC; 4s ago
 Main PID: 8506 (gunicorn)
    Tasks: 2 (limit: 2359)
   Memory: 26.0M
   CGroup: /system.slice/flaskapp.service
           ├─8506 /root/flaskapp/venv/bin/python3 /root/flaskapp/venv/bin/gunicorn --bind 0.0.0.0:5000 wsgi:app
           └─8508 /root/flaskapp/venv/bin/python3 /root/flaskapp/venv/bin/gunicorn --bind 0.0.0.0:5000 wsgi:app

Apr 21 07:25:51 debian10 systemd[1]: Started Gunicorn instance to serve Flask.
Apr 21 07:25:51 debian10 gunicorn[8506]: [2021-04-21 07:25:51 +0000] [8506] [INFO] Starting gunicorn 20.1.0
Apr 21 07:25:51 debian10 gunicorn[8506]: [2021-04-21 07:25:51 +0000] [8506] [INFO] Listening at: http://0.0.0.0:5000 (8506)
Apr 21 07:25:51 debian10 gunicorn[8506]: [2021-04-21 07:25:51 +0000] [8506] [INFO] Using worker: sync
Apr 21 07:25:51 debian10 gunicorn[8506]: [2021-04-21 07:25:51 +0000] [8508] [INFO] Booting worker with pid: 8508
```

## Configura Nginx para servir la aplicación de Python  
Primero instalamos el servicio Nginx
```
sudo apt install nginx
```
Para seguir, deberás crear un archivo de configuración de host virtual Nginx para servir la aplicación Python.
´´´
sudo nano /etc/nginx/conf.d/flaskapp.conf
```
Añade las siguientes líneas:
```
server {
    listen 80;
    server_name app.example.com;
    location / {
        include proxy_params;
        proxy_pass  http://127.0.0.1:5000;
    }
}
```
Guarda y cierra el archivo y después reinicia Nginx para aplicar los cambios de configuración:
```
sudo systemctl restart nginx
```
## Accede a la aplicación de Python 
Ahora abre tu navegador web y accede a tu aplicación Python con la URL [http://app.ejemplo.com](http://app.ejemplo.com).
Deberías ver tu aplicación.
