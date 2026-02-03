# Despliegue y Configuración de Redes Blockchain

## Introducción

Este documento trata los conceptos fundamentales sobre qué es una Blockchain y cómo operan las redes Blockchain. Está diseñada para proporcionar una base teórica sólida que permita comprender tanto la tecnología subyacente como su aplicación práctica en entornos empresariales.

---

# Parte 1: Fundamentos de Blockchain

## 1.1 ¿Qué es Blockchain?

### Definición formal

**Blockchain** es una base de datos distribuida, inmutable y descentralizada que mantiene un registro ordenado de transacciones agrupadas en bloques y enlazadas criptográficamente.

### Analogía didáctica: El libro de contabilidad compartido

Imagina un libro de contabilidad que:

- **No pertenece a nadie en particular**: Miles de copias idénticas existen en distintos lugares del mundo. Cualquier cambio debe reflejarse en todas las copias.
- **Tiene las páginas cosidas**: Cada página (bloque) lleva impreso un sello (hash) que la vincula con la página anterior. Si alguien modificara una página anterior, el sello (hash)  que le corresponde sería distinto, ya no coincidiría con el sello que lleva la siguiente página y se detectaría el fraude.
- **Se escribe con tinta indeleble**: Una vez escrito, no se puede borrar sin dejar rastro. Cualquier modificación invalida toda la cadena posterior.

### Propiedades clave

| Propiedad | Descripción | Implicación práctica |
|-----------|-------------|----------------------|
| **Descentralización** | No existe una autoridad central única que controle los datos. La red se mantiene por múltiples nodos independientes. | Elimina el punto único de fallo; no hay un "banco" que pueda bloquear transacciones o confiscar activos. |
| **Inmutabilidad** | Los datos no pueden modificarse sin consenso. La dificultad computacional (PoW) o las firmas digitales de validadores (PoA) hacen inviable reescribir la historia. | Auditoría fiable: lo que se registra permanece. Ideal para trazabilidad y cumplimiento normativo. |
| **Transparencia** | Los nodos pueden verificar el estado actual y el historial de transacciones. En redes públicas, cualquiera puede auditar; en privadas, los participantes autorizados. | Permite verificación sin confiar en un tercero. |
| **Tolerancia a fallos** | La red sigue funcionando aunque algunos nodos fallen o sean maliciosos (hasta un umbral definido por el protocolo de consenso). | Resiliencia: la red continúa operativa ante caídas parciales. |

### Blockchain vs base de datos tradicional

| Aspecto | Base de datos centralizada | Blockchain |
|---------|---------------------------|------------|
| **Control** | Un administrador decide qué se guarda | Consenso distribuido entre nodos |
| **Modificación** | Se pueden actualizar o borrar registros | Solo se añaden nuevos bloques; el historial es inmutable |
| **Confianza** | Se confía en el administrador | Se confía en la criptografía y el protocolo |
| **Rendimiento** | Muy alto (miles de TPS) | Limitado por el consenso (típicamente cientos de TPS en redes privadas) |

---

## 1.2 Arquitectura básica de una red Blockchain

### Componentes principales

#### 🔹 Nodos

Un **nodo** es una instancia de software blockchain (en nuestro caso **Hyperledger Besu**) que:

- Mantiene una copia del ledger (cadena de bloques y estado).
- Valida transacciones y bloques según las reglas del protocolo.
- Se comunica con otros nodos mediante protocolos P2P (peer-to-peer).

**Tipos de nodos:**

| Tipo | Función | Uso típico |
|------|---------|------------|
| **Nodo validador** | Propone bloques y participa en el consenso. Su identidad es conocida. | Infraestructura central de la red. |
| **Nodo no validador** | Solo replica la cadena y responde consultas. No propone bloques. | Nodos RPC para aplicaciones; nodos de respaldo. |
| **Nodo RPC** | Expone APIs (JSON-RPC, WebSockets) para que aplicaciones externas interactúen con la red. | DApps, wallets, scripts de administración. |
>**Nota:** Tanto nodos validadores como no validadores pueden ser además nodos RPC.

![Diagrama conceptual de Blockchain](./baliabideak/esquema_red_acceso.png)
#### 🔹 Ledger (Estado)

El *ledger* (libro de contabilidad) mantiene:

- **Historial de transacciones**: Secuencia de bloques con todas las transacciones ejecutadas.
- **Estado actual (World State)**: Balances de cuentas, código de contratos, almacenamiento de contratos. Se deriva de ejecutar todas las transacciones desde el bloque génesis.

#### 🔹 Transacciones

Una transacción representa un **cambio de estado** en la red:

- **Transferencia de valor**: Envío de ETH (o token nativo) de una cuenta a otra.
- **Llamada a un Smart Contract**: Ejecución de una función en un contrato desplegado.
- **Despliegue de contrato**: Creación de un nuevo contrato en la blockchain.

**Componentes de una transacción:**

| Campo | Descripción |
|-------|-------------|
| **Remitente** | Dirección de la cuenta que firma (identificada por su clave privada). |
| **Destinatario** | Dirección de la cuenta destino (vacía si es despliegue de contrato). |
| **Datos (payload)** | Código del contrato o parámetros codificados de la llamada. |
| **Gas** | Límite máximo de unidades de gas que se acepta consumir. Evita bucles infinitos y fija un techo de coste. |
| **Nonce** | Número secuencial que evita replay y ordena las transacciones del mismo remitente. |

#### 🔹 Consenso

Mecanismo que permite a los nodos **acordar el siguiente bloque válido** sin una autoridad central.

---

## 1.3 Estructura de datos: La cadena, el estado y los bloques

Como hemos mencionado, el *ledger* consiste en la **cadena** de **bloques** que incluye todas las transacciones y en el **estado actual** de ciertos 'objetos' (balances de cuentas, variables de contratos...)

### La cadena: mediante una lista enlazada criptográfica

Blockchain no es solo una base de datos; es un **registro histórico secuencial**. Cada bloque contiene:

- Un puntero al bloque anterior mediante su **hash** (huella criptográfica).
- Si alguien modifica un bloque antiguo, su hash cambia. El bloque siguiente tendría un puntero "roto" y la cadena quedaría invalidada.
- Por tanto, para falsificar el historial habría que recalcular los hashes de todos los bloques posteriores, lo cual es computacionalmente prohibitivo en redes con muchos bloques.

> **Figura:** Ejemplo visual de una blockchain como una cadena de bloques enlazados, donde cada bloque contiene transacciones y el hash del bloque anterior, formando una estructura segura e inmutable. La imagen ha sido obtenida de [esta página web](https://www.preethikasireddy.com/post/how-does-ethereum-work-anyway).

![Diagrama conceptual de Blockchain](./baliabideak/blockchain.png)

### El estado global: mediante árboles de Merkle

En plataformas como Ethereum o Hyperledger Besu, el **estado global** (balances, contratos, almacenamiento) no se guarda dentro de cada bloque. En su lugar:

- Se usa una estructura de datos tipo **Trie** (árbol de prefijos).
- El bloque solo contiene la **raíz** (Root Hash) de este árbol.
- Esto permite a clientes ligeros verificar un saldo sin descargar toda la blockchain: basta con la ruta desde la raíz hasta la hoja correspondiente.

### Anatomía de un bloque

Cada bloque tiene dos partes principales:

#### Cabecera (Header) – Metadatos

> **Figura:** Ejemplo visual de la cabecera de un bloque Ethereum con los campos más significativos. La imagen ha sido obtenida de [esta página web](https://www.preethikasireddy.com/post/how-does-ethereum-work-anyway).

![Diagrama conceptual de Blockchain](./baliabideak/block_header.png)

| Campo | Función |
|-------|---------|
| **ParentHash** | Hash del bloque anterior. Si no coincide, el bloque es huérfano y se descarta. |
| **Nonce** | Número usado una vez, exclusivo de PoW (prueba de trabajo) para demostrar el trabajo realizado; en PoA (prueba de autoridad) se fija a cero o a un valor convencional. |
| **Timestamp** | Marca de tiempo Unix cuando se creó el bloque. Ayuda a la sincronización y control del tiempo en la red. |
| **UncleHash (OmmersHash)** | Hash de la lista de "tíos" (bloques huérfanos reconocidos). En PoA suele estar vacío, pero sigue presente en la cabecera. |
| **Coinbase (Beneficiary)** | Dirección del validador que propone el bloque y recibe las comisiones. |
| **LogsBloom** | Filtro de Bloom que permite buscar eventos rápidamente sin leer todo el bloque. |
| **Difficulty** | Dificultad requerida para minar (PoW) o un valor fijo/testimonial en PoA. |
| **ExtraData** | En PoA, incluye la firma del validador y datos del consenso. Puede tener datos adicionales definidos por la red. |
| **Number** | Número de bloque en la cadena (altura). Permite orden cronológico. |
| **GasLimit** | Máximo de gas permitido para las transacciones del bloque. Define la capacidad de procesamiento. |
| **GasUsed** | Gas consumido realmente por las transacciones del bloque. |
| **MixHash** | En PoW contiene información de validación del proceso de minado; en PoA, suele ser un valor fijo. |
| **StateRoot** | Raíz del árbol de estado global *después* de ejecutar las transacciones del bloque. |
| **TransactionsRoot** | Raíz del árbol que contiene todas las transacciones del bloque. |
| **ReceiptsRoot** | Raíz del árbol de recibos (logs de eventos de Smart Contracts). Crucial para indexadores y dApps. |

> **Nota:** Algunos campos pueden no ser relevantes o rellenados en protocolos PoA como QBFT o Clique, pero siempre están presentes en la estructura de cabecera de bloque según la especificación de Ethereum.

#### Cuerpo (Body)

- Lista ordenada de transacciones.
- En redes PoW, puede incluir "uncles" (bloques huérfanos recompensados); en PoA suele estar vacío.

---

## 1.4 La EVM (Ethereum Virtual Machine) – El motor de ejecución

Hyperledger Besu implementa la **EVM**, la misma máquina virtual que Ethereum. Esto garantiza compatibilidad con contratos y herramientas del ecosistema Ethereum.

### Dónde y cuándo se ejecuta el código en la EVM

| Momento | Qué se ejecuta | Dónde |
|---------|----------------|-------|
| **Despliegue de contrato** | Cuando se envía una transacción con `to = vacío` y `data = bytecode del contrato`, la EVM ejecuta ese bytecode una sola vez. El resultado es el código que queda almacenado en la dirección del contrato recién creado. | En el nodo que procesa la transacción (cada validador la ejecuta al incluir el bloque). |
| **Llamada a contrato** | Cuando una transacción tiene `to = dirección del contrato` y `data = selector de función + parámetros codificados`, la EVM carga el bytecode almacenado en esa dirección y lo ejecuta. La función llamada viene determinada por los primeros 4 bytes (selector) de `data`. | En cada nodo que valida el bloque, de forma determinista, al aplicar la transacción. |
| **Llamadas internas (CALL/DELEGATECALL)** | Un contrato puede invocar a otro. La EVM suspende la ejecución actual, crea un nuevo "contexto" para la llamada interna, ejecuta el bytecode del contrato destino, y retoma el contexto original con el resultado. | Dentro de la misma transacción, como sub-ejecuciones. |

**Resumen:** La EVM no ejecuta código fuente (.sol) ni ABI. Solo ejecuta **bytecode** (código máquina de la EVM). La ejecución ocurre **cuando una transacción que afecta a un contrato se incluye en un bloque**; cada nodo de la red ejecuta las transacciones localmente para verificar que el resultado coincida con el del proponente del bloque.

### Solidity y los ficheros asociados

Los Smart Contracts se escriben típicamente en **Solidity**, un lenguaje de alto nivel inspirado en C/JavaScript. Durante el desarrollo se trabaja con varios artefactos:

| Fichero / Artefacto | Descripción | Para qué sirve |
|---------------------|-------------|----------------|
| **`.sol`** | Código fuente del contrato en Solidity. Contiene las funciones, variables de estado y lógica que el desarrollador escribe. | Es lo que se edita. No se sube a la blockchain. |
| **`.abi`** (Application Binary Interface) | Archivo JSON que describe la interfaz del contrato: nombres de funciones, parámetros, tipos de retorno, eventos. No contiene lógica ni bytecode. | Permite que aplicaciones externas (DApps, scripts, wallets) sepan cómo codificar las llamadas y decodificar los resultados. Es la "interfaz" entre el frontend y el contrato desplegado. |
| **Bytecode** | Código compilado (opcodes de la EVM). Suele generarse como string hexadecimal. Es lo que la EVM ejecuta. | Se incluye en el campo `data` de la transacción de despliegue. Una vez desplegado, se almacena en la blockchain asociado a la dirección del contrato. |

**Flujo típico:** El desarrollador escribe `MiContrato.sol` → el compilador (ej. Solidity `solc`) genera el bytecode y el ABI → el bytecode se despliega en la red → las aplicaciones usan el ABI para construir y enviar transacciones que llaman a las funciones del contrato.

**Importante – Versión de la EVM:** La EVM evoluciona con cada hard fork (London, Shanghai, Cancún, etc.). Cada red define en su `genesis.json` qué versión de EVM activa (por ejemplo, mediante bloques de activación de EIPs). Es **crucial compilar el contrato con la versión de EVM adecuada a la red** donde se desplegará. Si compilamos para una EVM más nueva que la de la red, el bytecode puede usar opcodes inexistentes y la transacción fallará. Si compilamos para una EVM más antigua, perdemos optimizaciones o funcionalidades. En Solidity se especifica con `pragma solidity ^0.8.0` y, en el compilador, con la opción `--evm-version` (ej. `paris`, `shanghai`).

### Arquitectura de pila (Stack-based)

- La EVM opera con una **pila de 256 bits**.
- Las instrucciones (opcodes como PUSH, POP, SSTORE, CALL) manipulan esta pila.
- Es una máquina de estado determinista: mismos inputs → mismos outputs.

### Tipos de almacenamiento

| Tipo | Persistencia | Coste (gas) | Uso |
|------|--------------|-------------|-----|
| **Storage** | Persistente (asociado al contrato) | Muy caro | Datos que deben perdurar entre llamadas. |
| **Memory** | Volátil (se borra tras la transacción) | Moderado | Datos temporales durante la ejecución. |
| **Stack** | Solo durante la instrucción actual | Gratis | Cálculos inmediatos (máx. 1024 elementos). |
| **Calldata** | Solo lectura | Bajo | Parámetros de entrada de la transacción. |

### Gas y el problema de la parada

La EVM es **Turing-completa**: puede ejecutar cualquier algoritmo, incluidos bucles potencialmente infinitos. Para evitar que una transacción bloquee la red indefinidamente:

- Cada operación consume **gas** (unidades de coste).
- El remitente establece un **límite de gas** (gas limit).
- Si se agota el gas antes de completar la transacción, esta se revierte (pero el gas consumido se cobra igual).
- Esto garantiza que toda ejecución termina en tiempo acotado.

---


# Parte 2: Redes Blockchain

## 2.1 Tipos de redes Blockchain

### Taxonomía de redes

| Característica | Pública (Permissionless) | Consorcio (Permissioned) | Privada (Fully Private) |
|----------------|--------------------------|---------------------------|--------------------------|
| **Acceso** | Cualquiera puede leer/escribir | Solo miembros autorizados | Una sola organización |
| **Gobernanza** | Descentralizada (DAO, off-chain) | Semiescenalizada (Junta de miembros) | Centralizada |
| **Transparencia** | Total | Restringida a miembros | Interna |
| **Rendimiento** | Limitado por descentralización | Alto (red confiable) | Muy alto |
| **Finalidad** | Probabilística (generalmente) | Inmediata (determinista) | Inmediata |
| **Casos de uso** | Criptomonedas, DeFi, NFTs | Supply chain, CBDCs, Banca | Auditoría interna, Pruebas |

### 🔓 Redes públicas

**Ejemplos:** Bitcoin, Ethereum

**Características:**

- Acceso abierto: cualquiera puede ejecutar un nodo, minar/validar y enviar transacciones.
- Alta descentralización: miles de nodos repartidos por el mundo.
- Bajo rendimiento: el consenso (PoW/PoS) limita las transacciones por segundo.
- Consenso costoso: requiere minería o staking económico para garantizar seguridad.

**Casos de uso:**

- Criptomonedas.
- Finanzas descentralizadas (DeFi).
- NFTs y aplicaciones descentralizadas abiertas.

### 🔐 Redes privadas (nuestro caso)

**Ejemplos:** Hyperledger Besu, Fabric

**Características:**

- Acceso restringido: solo nodos y cuentas autorizadas.
- Identidad conocida: los validadores son identificables.
- Alto rendimiento: consenso eficiente (PoA) sin minería.
- Gobernanza controlada: una o varias organizaciones definen las reglas.

**Casos de uso:**

- Redes empresariales internas.
- Bancos y sector financiero.
- Trazabilidad de productos.
- Auditoría y cumplimiento normativo.

### 🤝 Redes de consorcio

**Características:**

- Control compartido entre varias organizaciones.
- Nodos autorizados por acuerdo mutuo.
- Confianza parcial: no se confía plenamente en ningún participante individual.

**Casos de uso:**

- Supply chain entre fabricantes, distribuidores y minoristas.
- Redes interbancarias.
- Plataformas de identidad digital compartida.

---

## 2.2 Protocolos de consenso

El consenso es el mecanismo que permite a los nodos acordar cuál es el siguiente bloque válido y mantener la consistencia de la red.

### Proof of Work (PoW)

- **Mecanismo:** Los nodos (mineros) compiten resolviendo un problema criptográfico (encontrar un nonce tal que el hash del bloque cumpla ciertas condiciones).
- **Incentivo:** El primero en resolverlo propone el bloque y recibe la recompensa.
- **Ventajas:** Seguridad probada, resistencia a ataques.
- **Desventajas:** Alto consumo energético, tiempo de confirmación elevado.
- **Ejemplo:** Bitcoin.

### Proof of Stake (PoS)

- **Mecanismo:** Los validadores se eligen según la cantidad de criptomoneda que "apuestan" (stake). Cuanto mayor el stake, mayor probabilidad de ser elegido para proponer bloques.
- **Ventajas:** Más eficiente que PoW, menor consumo energético.
- **Desventajas:** Riqueza inicial puede concentrar poder.
- **Ejemplo:** Ethereum 2.0.

### Delegated Proof of Stake (DPoS)

- **Mecanismo:** Los poseedores de tokens votan a delegados que validarán bloques en su nombre.
- **Ventajas:** Alta velocidad y eficiencia.
- **Desventajas:** Mayor centralización (pocos validadores activos).
- **Ejemplo:** EOS.

### ⭐ Proof of Authority (PoA) – Caso práctico (Hyperledger Besu)

PoA sustituye la dificultad matemática (PoW) o económica (PoS) por la **identidad digital**. Los validadores son conocidos y autorizados; su reputación actúa como garantía.

**Características:**

- Validadores autorizados con identidad verificada.
- Cada bloque es firmado por un validador.
- No requiere minería ni staking económico.
- Eficiente y adecuado para redes privadas y de consorcio.

**Implementaciones en Hyperledger Besu:**

| Opción | Uso recomendado |
|--------|------------------|
| **Clique PoA** | Redes de desarrollo o prueba. Más simple. |
| **QBFT (Quorum Byzantine Fault Tolerance)** | Producción. Tolerancia a fallos bizantinos. |

#### 🔹 Cómo funciona QBFT

QBFT es un protocolo BFT (Byzantine Fault Tolerance) que extiende PoA. Sus fases son:

1. **Pre-Prepare:** El proponente (validador seleccionado por turno) envía el bloque propuesto a los demás.
2. **Prepare:** Los validadores confirman la recepción y validez del bloque.
3. **Commit:** Los validadores confirman que han visto suficiente quórum de mensajes "Prepare" y proceden a escribir el bloque en su copia local.

**Propiedades clave:**

- **Finalidad inmediata:** Una vez confirmado, un bloque no puede revertirse (a diferencia de PoW, donde existe riesgo de reorganización).
- **Tolerancia a fallos:** La red puede soportar hasta `f = (n - 1) / 3` nodos fallidos o maliciosos, donde `n` es el número total de validadores.
  - Ejemplo: con 4 nodos, se tolera 1 fallo.
- **Mensajería firmada:** Los nodos intercambian mensajes firmados digitalmente para garantizar integridad y autenticidad.

**Liveness vs Safety:** QBFT prioriza la seguridad (consistencia) sobre la vivacidad. Si la red se particiona y no puede alcanzar quórum, se detiene en lugar de bifurcarse en cadenas divergentes.

---

# Parte 3: Operación de redes Blockchain

## 3.1 Comunicación entre nodos

### Protocolo P2P (peer-to-peer)

- Los nodos se conectan entre sí formando una red mesh.
- Protocolos típicos: **devp2p** (Ethereum), enlaces TCP/IP.
- Intercambian: bloques, transacciones, mensajes de consenso.

### Descubrimiento de nodos

| Modo | Uso | Descripción |
|------|-----|-------------|
| **Discovery (DHT)** | Redes públicas | Los nodos usan una tabla hash distribuida (Kademlia) para encontrar pares al azar. |
| **Static (static-nodes.json)** | Redes privadas | Lista fija de Enodes (URI con clave pública, IP y puerto). Al arrancar, el nodo se conecta agresivamente a esta lista. |

### Bootnodes

- Nodos iniciales conocidos que facilitan el descubrimiento.
- En redes privadas, suelen ser los validadores o nodos dedicados.

### APIs externas

Hyperledger Besu expone:

- **JSON-RPC (HTTP):** Para consultas y envío de transacciones.
- **WebSockets:** Para suscripciones en tiempo real (nuevos bloques, logs).

---

## 3.2 Seguridad en redes Blockchain

### Criptografía

- **ECDSA:** Firmas digitales para transacciones y bloques.
- **Keccak-256:** Función hash utilizada (compatible con Ethereum).
- Las claves privadas nunca deben exponerse; las direcciones derivan de la clave pública.

### Gestión de claves

- Cada nodo y cuenta tiene una clave privada que controla su identidad.
- Buenas prácticas: no versionar claves, usar volúmenes protegidos, rotación periódica.
- En producción: integración con Vault (Hashicorp, Azure Key Vault) para que el nodo no almacene la clave en texto plano.

### Autenticación y autorización

En redes privadas:

- Control de acceso a nodos (whitelist de Enodes): restringir qué nodos pueden conectarse a cada nodo.
- Control de cuentas permitidas: restringir que cuentas pueden operar en la red a la hora de hacer transacciones.
- Gestión de validadores QBFT (propuestas y votaciones on-chain).
- Acceso a APIs de administración de la red mediante JWT (JSON Web Tokens).

---

## 3.3 Monitorización y mantenimiento

### Indicadores clave

- Estado de sincronización (`eth_syncing`).
- Número de peers conectados.
- Tiempo desde el último bloque (latencia de la red).
- Uso de recursos (CPU, disco, memoria).

### Herramientas

- Logs de Besu.
- Ethstats.
- Prometheus + Grafana para métricas.
- Alertas: peers < umbral, bloqueo de producción de bloques, uso alto de CPU.

### Mantenimiento típico

- Actualización de versión de Besu.
- Reinicio controlado de nodos.
- Backup de datos (con nodo detenido o snapshots de volumen).
- Añadir/eliminar validadores siguiendo el proceso de votación QBFT.

---

# Anexo: Glosario técnico

| Término | Definición |
|---------|------------|
| **Trie** | Estructura de datos tipo árbol que permite almacenar y recuperar datos por prefijos. Usado para el estado y las transacciones. |
| **Hash** | Huella criptográfica de longitud fija que identifica unívocamente un conjunto de datos. Cualquier cambio en los datos altera el hash. |
| **Finalidad** | Garantía de que un bloque no será revertido. En QBFT es inmediata; en PoW es probabilística (aumenta con las confirmaciones). |
| **Gas** | Unidad de coste que mide el trabajo computacional. Cada operación en la EVM consume gas. |
| **Enode** | URI que identifica un nodo en la red P2P (clave pública + IP + puerto). |
| **Genesis** | Bloque inicial (bloque 0) que define los parámetros de la red. Debe ser idéntico en todos los nodos. |
| **Ledger** | Conjunto formado por la cadena de bloques y el estado global derivado. |

---