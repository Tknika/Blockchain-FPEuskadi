# Hardhat

Es un entorno de desarrollo para software de Ethereum.

Nos permitirá compilar y desplegar nuestro smart contract con ficheros de configuración y desde la línea de comandos sin depender de Remix ni Metamask.

## Instalación

Creamos una carpeta que puede llamarse "hardhat" por ejemplo e inicializamos un proyecto Node.js:

`npm init -y`

Instalamos Hardhat:

`npm install --save-dev hardhat`

Podemos crear un proyecto inicial ejecutando:

`npx hardhat init`

Seleccionamos "Create a JavaScript project" y aceptamos la respuesta poir defecto en las demás preguntas (pulsar Intro) salvo tal vez la opción de mandar reportes de errores.

## Compilar contrato

Copiamos Ziurtagiriak.sol a la carpeta contracts (como se encuentra en este repositorio) y eliminamos otros que no sean de nuestro proyecto.

Ejecutamos este comando para descargar las dependencias de Ziurtagiriak.sol:

`npm install --save-dev @openzeppelin/contracts@4.9.3`

Es importante indicarle la versión a descargar porque el contrato está diseñado para Solidity 0.8.9

Las importaciones de Ziurtagiriak.sol ya no tienen que indicar esa versión porque al descargar se han guardado en una carpeta sin indicar la versión.

Creamos un fichero **secrets.json** como el que se encuentra en este repositorio para almacenar la clave privada del creador del contrato.

Sustituimos el fichero **hardhat.config.js** con el que se encuentra en este repositorio y actualizamos la configuración.

Compilamos:

`npx hardhat compile`

## Desplegar contrato

Copiamos el fichero deploy_Ziurtagiriak.js a la carpeta scripts (como se encuentra en este repositorio) y ejecutamos:

`npx hardhat run --network besu scripts/deploy_Ziurtagiriak.js`

Si se ha ejecutado correctamente nos devolverá la dirección del contrato.
