# Instalación del servidor web

[Cómo desplegar una aplicación de Python en Debian 10] (https://help.clouding.io/hc/es/articles/360021332399-C%C3%B3mo-desplegar-una-aplicaci%C3%B3n-de-Python-en-Debian-10)

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
Ahora crea la aplicación Python

# Falta la parte de instalar el servicio Gunicor, crear el fichero del servicio y configuración Nginx
