# Hardhat

Es un entorno de desarrollo para software de Ethereum.

Nos permitirá compilar y desplegar nuestro smart contract con ficheros de configuración y desde la línea de comandos sin depender de Remix ni Metamask.

## Instalación

En esta misma carpeta instalamos Hardhat:

`npm install --save-dev hardhat`

Instalamos dependencias de Hardhat:

`npm install --save-dev @nomicfoundation/hardhat-toolbox`

Instalamos otras dependencias que necesitemos, en este caso dependencias de OpenZeppelin para el contrato Ziurtagiriak.sol:

`npm install --save-dev @openzeppelin/contracts@4.9.3`

Es importante indicarle la versión a descargar porque el contrato está diseñado para Solidity 0.8.9

Las importaciones de Ziurtagiriak.sol ya no tienen que indicar esa versión porque al descargar se han guardado en una carpeta sin indicar la versión.

## Compilar contrato

Creamos/modificamos el fichero **secrets.json** para almacenar las claves privadas de los creadores de cada contrato.

Revisamos el fichero **hardhat.config.js** por si hay que modificar la configuración. Por defecto utilizará el token JWT situado en **JWT_1** para autenticarse a la hora de desplegar los contratos.

Compilamos (se van a compilar los contratos situados en la carpeta **contracts**):

`npx hardhat compile`

## Desplegar contratos

### Ziurtagiriak:
`npx hardhat run --network besu scripts/deploy_Ziurtagiriak.js`

### Etiketa Inteligente:
`npx hardhat run --network besu scripts/deploy_Etiketa.js`

Si se han ejecutado correctamente nos devolverán las direcciones de los contratos, que habrá que actualizar en los ficheros de las variables de entorno de cada proyecto en la carpeta WebServer.
