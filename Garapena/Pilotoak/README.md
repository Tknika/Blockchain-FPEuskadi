# Instalación del servidor web

[Cómo desplegar una aplicación de Python en Debian 10] (https://help.clouding.io/hc/es/articles/360021332399-C%C3%B3mo-desplegar-una-aplicaci%C3%B3n-de-Python-en-Debian-10)

## Instalamos las dependencias necesarias
Necesitamos intalar las siguientes librerías en el sistema _python3-pip libssl-dev libffi-dev python3-dev build-essential python3-setuptools_
```
apt-get install python3-pip libssl-dev libffi-dev python3-dev build-essential python3-setuptools -y 
```
Una vez todos los paquetes estén instalados, instala un paquete de entorno virtual de Python con el siguiente comando: 
```
apt-get install python3-venv -y
```
Para continuar, actualiza el PIP a la última versión con el siguiente comando:
```
pip3 install --upgrade pip
```
También necesitarás instalar el servidor web Nginx para servir la aplicación Python. Puedes hacerlo usando el siguiente comando:
```
apt-get install nginx -y
```
