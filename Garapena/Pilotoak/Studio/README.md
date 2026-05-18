# BFPE SmartContract Studio

Plataforma didactica para compilar contratos Solidity, desplegarlos en la red BFPE usando la wallet del usuario y generar automaticamente una interfaz de interaccion a partir del ABI.

## Que hace

- Sube un fichero `.sol` desde el navegador.
- Permite generar Solidity desde un SmartContract Builder visual integrado basado en Blockly.
- Compila el contrato con `solc` configurado para `evmVersion: london`.
- Prioriza y marca el contrato recomendado a desplegar si el fichero contiene varios contratos.
- Conecta MetaMask u otra wallet inyectada y despliega con la direccion del usuario.
- Devuelve la direccion desplegada y permite descargar el ABI en JSON.
- Genera formularios dinamicos para invocar funciones `view`, `pure`, `nonpayable` y `payable`.
- Muestra una guia contextual en la parte superior para indicar el siguiente paso del flujo.

## Arquitectura

- `backend/`: API Express que compila Solidity con `solc`, tanto desde ficheros subidos como desde codigo fuente enviado en JSON.
- `frontend/`: app React + Ethers que conecta la wallet, despliega y genera la UI dinamica, con selector entre subida manual y SmartContract Builder.
- `docker-compose.yml`: levanta el frontend (`studio`) y el backend (`studio-backend`).

Todo el despliegue de la aplicacion se realiza en contenedores Docker:

- El frontend se sirve desde el contenedor `studio` (Nginx).
- El backend de compilacion corre en el contenedor `studio-backend` (Node.js).
- El backend no se expone al host; solo es accesible desde la red interna de Docker a traves del frontend.
- El unico requisito en la maquina anfitriona es Docker Desktop o un runtime Docker compatible con Compose.
- La wallet del usuario no se contenedoriza: la firma del despliegue se hace desde la extension del navegador del usuario, que interactua con la web servida por los contenedores.

## SmartContract Builder integrado

La integracion del Builder visual basado en Blockly ya forma parte de la aplicacion. El Builder se sirve como microfrontend estatico dentro del frontend principal, conserva su workspace en `localStorage` y puede exportar el Solidity generado directamente al flujo de compilacion y despliegue.

Las plantillas integradas ERC-20 y ERC-721 usan contratos base locales, quedan ordenadas para destacar el contrato principal del usuario y exponen `mint` en el ABI del contrato derivado para que la interaccion sea directa desde el Playground.

La estrategia de integracion y las decisiones de arquitectura estan documentadas en [docs/smartcontract-builder-integration.md](docs/smartcontract-builder-integration.md).

## Decision tecnica sobre la compilacion

La compilacion backend se mantiene con `solc` y no depende de Remix IDE.

Motivos de esta decision:

- Remix IDE no expone una API HTTP publica y estable para enviar contratos desde este sistema y recuperar ABI y bytecode como servicio remoto.
- El ecosistema Remix si ofrece piezas reutilizables como `@remix-project/remix-solidity`, pero son librerias internas/orientadas a plugins, no una interfaz desacoplada y simple para una arquitectura Docker backend + frontend.
- `remixd` no resuelve la compilacion backend: solo conecta el sistema de archivos local con Remix IDE por WebSocket.
- Para este proyecto didactico interesa fijar de forma explicita la compilacion con `evmVersion: london`, controlar la version del compilador y reducir dependencias del IDE.
- `solc` simplifica el despliegue en contenedores, mejora la trazabilidad de errores de compilacion y evita acoplar la plataforma a flujos de navegador o plugins de Remix.

Conclusion:

- Remix es una excelente herramienta educativa e interactiva para desarrollo manual.
- Para esta plataforma web autocontenida, `solc` es la opcion mas robusta, portable y mantenible para la compilacion del smart contract.

## Puesta en marcha

1. Crea tu fichero de entorno a partir de `.env.example` y ajusta los valores a tu red:

```bash
cp .env.example .env
```

2. Arranca la aplicacion completa en Docker:

```bash
docker compose up --build -d
```

3. Abre `http://localhost:5007` (o el puerto configurado en `FRONTEND_PORT`).

Para reconstruir desde cero sin cache:

```bash
docker compose build --no-cache
docker compose up -d
```

## Variables de entorno

| Variable | Descripcion | Valor por defecto |
|---|---|---|
| `FRONTEND_PORT` | Puerto expuesto por la web | `5007` |
| `VITE_BESU_RPC_URL` | RPC HTTP de la red objetivo | `http://localhost:18545` |
| `VITE_CHAIN_ID` | Chain ID esperado por la wallet | `4321` |
| `VITE_NETWORK_NAME` | Nombre mostrado al sugerir la red | `Besu Dev` |
| `VITE_NATIVE_CURRENCY_NAME` | Nombre de la moneda nativa | `Besu Ether` |
| `VITE_NATIVE_CURRENCY_SYMBOL` | Simbolo de la moneda nativa | `ETH` |
| `VITE_BLOCK_EXPLORER_URL` | Explorer opcional para la red | _(vacio)_ |

Las variables `VITE_*` son de tiempo de compilacion: se inyectan en el bundle del frontend durante el `docker compose build`. Cualquier cambio requiere reconstruir la imagen del frontend.

La API backend queda en la red interna del stack y no necesita puerto publicado en el host.

## Flujo recomendado

1. Configura MetaMask para la red objetivo (Chain ID, RPC URL, simbolo de moneda).
1. Asegurate de que la cuenta del usuario tenga saldo en esa red.
1. Sube un `.sol` autocontenido o generalo desde SmartContract Builder.
1. Compila, revisa el contrato recomendado y rellena el constructor si aplica.
1. Despliega con la wallet.
1. Descarga el ABI o interactua desde la misma aplicacion.

## Limitaciones actuales

- El backend compila el fichero subido como una unica unidad de compilacion. Para un uso didactico funciona bien con contratos autocontenidos.
- Si el fichero contiene imports externos no incluidos en el propio archivo, habra que extender el resolver de imports.
- El despliegue usa siempre la cuenta conectada en la wallet; el backend no custodia claves privadas.
