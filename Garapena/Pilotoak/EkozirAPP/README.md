## EtiketaAPP

### 1. Instalación

Mediante contenedores Docker tal y como está definido en el docker-compose.yml de la carpeta Webserver junto con el fichero de las variables de entorno (ekozir.env).

### 2. Ejecución

Accediendo a ekozir.localhost en el navegador. Si la URL es diferente hay que modificar la configuración en /Garapena/Webserver/nginx/conf.d/EkozirApp.conf

### 3. Multi-Language Support

The application supports three languages:
- **Basque (EU)** - Default language
- **Spanish (ES)**
- **English (EN)**

A language selector is available in the top right corner of the page. After installing dependencies, compile the translation files:

```bash
pybabel compile -d app/translations
```