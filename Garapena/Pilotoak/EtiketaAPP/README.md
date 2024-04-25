## EtiketaAPP

### 1. Instalación

Mediante contenedores Docker tal y como está definido en el docker-compose.yml de la carpeta Webserver junto con el fichero de las variables de entorno (etiketa.env).

### 2. Ejecución

Accediendo a etiketa.localhost en el navegador. Si la URL es diferente hay que modificar la configuración en /Garapena/Webserver/nginx/conf.d/EtiketaApp.conf
Los usuarios/contraseña creados son desde empresa1/password1 hasta empresa10/password10

### 3. Funcionamiento

Una vez logueado, se introducen los datos de un lote y se guardan/modifican a medida que se dispone de ellos. Cuando se guardan se están guardando en la base de datos del servidor. Cuando pulsamos 'Registrar lote' se guarda un registro en el blockchain. Ésta es la información que luego está accesible mediante el código QR disponible para cada lote.

### 4. Consideraciones

Por ahora se permite modificar el identificador del lote tras crearlo.
Si se hacen cambios posteriores en un lote ya 'registrado', hay que volver a registrarlo para que los cambios se reflejen en el blockchain.
La comunicación con Thingsboard se hace mediante tokens JWT: con un usuario que tiene acceso a los datos de los sensores en Thingsboard ejecutamos:

`curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{"username":"USUARIO",  "password": "CONTRASEÑA" }' 'https://thingsboard.tknika.eus/api/auth/login'`

Esto nos devuelve dos tokens: *token* y *refreshToken* en un json. El refreshToken es el que tenemos que copiar en el fichero refresh_JWT.txt porque cada vez que se va a hacer una consulta al Thingsboard, se hace primero una consulta con este token, con el que se obtiene el token que luego se va a utilizar para obtener los datos de los sensores.