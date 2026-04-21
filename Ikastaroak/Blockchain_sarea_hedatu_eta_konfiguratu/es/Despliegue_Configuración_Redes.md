# Despliegue y Configuración de Redes Blockchain

## Introducción

Este documento trata los conceptos fundamentales sobre qué es una Blockchain y cómo operan las redes Blockchain. Está diseñada para proporcionar una base teórica sólida que permita comprender tanto la tecnología subyacente como su aplicación práctica en entornos empresariales.

---

# Parte 1: Fundamentos de Blockchain

## 1.1 ¿Qué es Blockchain?

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
| **Rendimiento** | Muy alto, miles de transacciones por segundo (TPS) | Limitado por el consenso (típicamente cientos de TPS en redes privadas) |

---

## 1.2 Arquitectura básica de una red blockchain

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

![Diagrama conceptual de Blockchain](../baliabideak/esquema_red_acceso.png)
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
| **Gas** | Límite máximo de unidades de gas que se acepta consumir. Evita bucles infinitos y fija un techo de coste. El coste real se paga en la moneda nativa de la red (p. ej. ETH): **gas consumido × precio del gas** = comisión que recibe el validador. El remitente indica además el *gas price* (o *max fee* en EIP-1559) que está dispuesto a pagar por unidad de gas. |
| **Nonce** | Número secuencial que evita replay y ordena las transacciones del mismo remitente. **Replay:** una transacción firmada podría ser copiada y reenviada por un tercero (por ejemplo en otra red o de nuevo en la misma) para repetir la misma operación (p. ej. otra transferencia). Como cada transacción válida debe llevar el siguiente nonce esperado para esa cuenta, una vez ejecutada ese nonce ya está "usado" y la misma transacción no puede volver a incluirse: quedaría invalidada. |

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

![Diagrama conceptual de Blockchain](../baliabideak/blockchain.png)

### El estado global: mediante árboles de Merkle

En plataformas como Ethereum o Hyperledger Besu, el **estado global** (balances, contratos, almacenamiento) no se guarda dentro de cada bloque. En su lugar:

- Se usa una estructura de datos tipo **Trie** (árbol de prefijos).
- El bloque solo contiene la **raíz** (Root Hash) de este árbol. Es el hash que representa el nodo superior de una estructura de datos tipo árbol (Trie/Merkle Tree). Este hash se calcula a partir de todos los datos almacenados en las hojas del árbol y sus ramas intermedias. Cambiar un sólo dato en cualquier hoja cambia la raíz.
- Así, almacenar sólo la raíz en el bloque permite comprobar de forma eficiente (mediante pruebas de inclusión) que una transacción, estado o recibo está realmente incluido sin revelar ni almacenar todo el árbol en cada bloque. Esto permite a clientes ligeros verificar un saldo sin descargar toda la blockchain: basta con la ruta desde la raíz hasta la hoja correspondiente.

### Anatomía de un bloque

Cada bloque tiene dos partes principales:

#### Cabecera (Header) – Metadatos

> **Figura:** Ejemplo visual de la cabecera de un bloque Ethereum con los campos más significativos. La imagen ha sido obtenida de [esta página web](https://www.preethikasireddy.com/post/how-does-ethereum-work-anyway).

![Diagrama conceptual de Blockchain](../baliabideak/block_header.png)

| Campo | Función |
|-------|---------|
| **ParentHash** | Hash del bloque anterior. Si no coincide, el bloque es huérfano y se descarta. |
| **Nonce** | Número usado una vez, exclusivo de PoW (prueba de trabajo) para demostrar el trabajo realizado; en PoA (prueba de autoridad) se fija a cero o a un valor convencional. |
| **Timestamp** | Marca de tiempo Unix cuando se creó el bloque. Ayuda a la sincronización y control del tiempo en la red. |
| **UncleHash (OmmersHash)** | Hash de la lista de "tíos" (bloques huérfanos reconocidos). En PoA suele estar vacío, pero sigue presente en la cabecera. |
| **Coinbase (Beneficiary)** | Dirección del validador que propone el bloque y recibe las comisiones. Aquí es donde el minero o validador reciben la recompensa por minar el bloque. |
| **LogsBloom** | Filtro de Bloom (estructura de datos probabilística que permite verificar rápidamente si un evento podría estar presente, aunque con posibles falsos positivos), utilizado para buscar eventos de forma eficiente sin leer todo el bloque. |
| **Difficulty** | Dificultad requerida para minar (PoW) o un valor fijo/testimonial en PoA. |
| **ExtraData** | En PoA, incluye la firma del validador y datos del consenso. Puede tener datos adicionales definidos por la red. |
| **Number** | Número de bloque en la cadena (altura). Permite mantener un orden cronológico. |
| **GasLimit** | Máximo de gas permitido para las transacciones del bloque. Define la capacidad de procesamiento. |
| **GasUsed** | Gas consumido realmente por las transacciones del bloque. |
| **MixHash** | En PoW contiene información de validación del proceso de minado; en PoA, suele ser un valor fijo. Esta validación consiste en que, junto con el Nonce, el MixHash demuestra que se ha realizado el trabajo computacional necesario (por ejemplo, que el hash del bloque cumple el objetivo de dificultad). |
| **StateRoot** | Raíz del árbol de estado global *después* de ejecutar las transacciones del bloque. |
| **TransactionsRoot** | Raíz del árbol que contiene todas las transacciones del bloque. |
| **ReceiptsRoot** | Raíz del árbol de recibos (logs de eventos de Smart Contracts). Crucial para indexadores y dApps. |

> **Nota:** Algunos campos pueden no ser relevantes o rellenados en protocolos PoA como QBFT o Clique, pero siempre están presentes en la estructura de cabecera de bloque según la especificación de Ethereum.

#### Cuerpo (Body)

- Lista ordenada de transacciones.
- En redes PoW, puede incluir "uncles" (bloques huérfanos recompensados); en PoA suele estar vacío.

---

## 1.4 La EVM (Ethereum Virtual Machine) – El motor de ejecución

La **EVM** (Ethereum Virtual Machine) es el entorno de ejecución para los smart contracts en Ethereum y redes compatibles como Hyperledger Besu. Es una máquina virtual determinista, basada en pila, que ejecuta bytecode de contratos de forma idéntica en todos los nodos, garantizando que el estado de la blockchain evolucione de forma consistente y verificable. La EVM aísla los contratos del sistema anfitrión, define cómo se procesan transacciones y contratos, y regula el consumo de recursos mediante el coste de gas, asegurando la seguridad y el funcionamiento autónomo de la red.

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
| **`.bytecode`** | Código compilado (opcodes de la EVM). Suele generarse como string hexadecimal. Es lo que la EVM ejecuta. | Se incluye en el campo `data` de la transacción de despliegue. Una vez desplegado, se almacena en la blockchain asociado a la dirección del contrato. |

**Flujo típico:** El desarrollador escribe `MiContrato.sol` → el compilador genera el bytecode (`MiContrato.bytecode`) y el ABI (`MiContrato.abi`)→ el bytecode se despliega en la red → las aplicaciones usan el ABI para construir y enviar transacciones que llaman a las funciones del contrato.

**Importante – Versión de la EVM:** La EVM evoluciona con cada hard fork (London, Shanghai, Cancún, etc.). Cada red define en su `genesis.json` qué versión de EVM activa. Es **crucial compilar el contrato con la versión de EVM adecuada a la red** donde se desplegará. Si compilamos para una EVM más nueva que la de la red, el bytecode puede usar opcodes inexistentes y la transacción fallará. Si compilamos para una EVM más antigua, perdemos optimizaciones o funcionalidades. En Solidity se especifica con `pragma solidity ^0.8.0` y, en el compilador, con la opción `--evm-version` (ej. `paris`, `shanghai`).

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

| Característica | Pública (Sin permiso) | Consorcio (Permisionada) | Privada |
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
- Consenso costoso: requiere minería o *staking* económico para garantizar seguridad.

**Casos de uso:**

- Criptomonedas.
- Finanzas descentralizadas (DeFi).
- NFTs y aplicaciones descentralizadas abiertas.

### 🤝 Redes de consorcio

**Ejemplos:** Alastria, R3 Corda

**Características:**

- Control compartido entre varias organizaciones.
- Nodos autorizados por acuerdo mutuo.
- Confianza parcial: no se confía plenamente en ningún participante individual.

**Casos de uso:**

- Cadena de suministro entre fabricantes, distribuidores y minoristas.
- Redes interbancarias.
- Plataformas de identidad digital compartida.

### 🔐 Redes privadas

**Ejemplos:** Hyperledger Besu, Fabric

**Características:**

- Acceso restringido: solo nodos y cuentas autorizadas.
- Identidad conocida: los validadores son identificables.
- Alto rendimiento: consenso eficiente sin minería.
- Gobernanza controlada: una o varias organizaciones definen las reglas.

**Casos de uso:**

- Redes empresariales internas.
- Bancos y sector financiero.
- Trazabilidad de productos.
- Auditoría y cumplimiento normativo.

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

### Proof of Authority (PoA)

PoA sustituye la dificultad matemática (PoW) o económica (PoS) por la **identidad digital**. Los validadores son conocidos y autorizados.

**Características:**

- Validadores autorizados con identidad verificada.
- Cada bloque es firmado por un validador.
- No requiere minería ni staking económico.
- Eficiente y adecuado para redes privadas y de consorcio.

---

## 2.3 Hyperledger Besu - Nuestra implementación práctica

Las prácticas de este curso las vamos a desarrollar desplegando una [red privada Hyperledger Besu](https://besu.hyperledger.org/private-networks) con conseso PoA. Es un [software de código abierto](https://github.com/hyperledger/besu/), se sigue desarrollando de forma activa e implementa la **EVM**, la misma máquina virtual que Ethereum, esto garantiza compatibilidad con contratos y herramientas del ecosistema Ethereum.

**Implementaciones de PoA en Hyperledger Besu:**

| Opción | Uso recomendado |
|--------|------------------|
| **Clique PoA** | Utilizado principalmente en redes de desarrollo o entornos de prueba, Clique es un protocolo de Proof of Authority sencillo y fácil de configurar. Es ideal para escenarios donde se prioriza la rapidez en las pruebas y la facilidad de despliegue sobre la seguridad avanzada. No es recomendable para entornos de producción debido a su simplicidad y menor tolerancia a fallos. |
| **IBFT (Istanbul Byzantine Fault Tolerance)** | Producción y consorcios. Variante BFT ampliamente soportada en múltiples redes empresariales; adecuado para entornos donde se requiere tolerancia a fallos y redundancia. |
| **QBFT (Quorum Byzantine Fault Tolerance)** | Diseñado para entornos de producción, QBFT ofrece tolerancia a fallos bizantinos, permitiendo que la red siga operativa incluso si algunos nodos actúan de forma maliciosa o fallan. Este protocolo está pensado para redes donde la seguridad, la fiabilidad y la resiliencia ante fallos son prioritarias, garantizando mayor robustez y consistencia en consorcios o empresas. |

#### 🔹 Cómo funciona QBFT (nuestro caso)

QBFT es un protocolo BFT (Byzantine Fault Tolerance) que implementa PoA (prueba de autoridad). Sus fases son:

1. **Pre-Prepare:** El proponente (validador seleccionado por turno) envía el bloque propuesto a los demás.
2. **Prepare:** Los validadores confirman la recepción y validez del bloque.
3. **Commit:** Los validadores confirman que han visto suficiente quórum de mensajes "Prepare" y proceden a escribir el bloque en su copia local.

**Propiedades clave:**

- **Finalidad inmediata:** Una vez confirmado, un bloque no puede revertirse (a diferencia de PoW, donde existe riesgo de reorganización).
- **Tolerancia a fallos:** La red puede soportar hasta `f = (n - 1) / 3` nodos fallidos o maliciosos, donde `n` es el número total de validadores.
  - Ejemplo: con 4 nodos, se tolera 1 fallo.
- **Mensajería firmada:** Los nodos intercambian mensajes firmados digitalmente para garantizar integridad y autenticidad.

**Vivacidad vs Consistencia:** QBFT prioriza la seguridad (consistencia) sobre la vivacidad. Si la red se particiona y no puede alcanzar quórum, se detiene en lugar de bifurcarse en cadenas divergentes.

---

# Parte 3: Despliegue de una red Blockchain preconfigurada

Vamos a desplegar una red blockchain Hyperledger Besu **preconfigurada** en 4 máquinas virtuales (Ubuntu Server) que pueden comunicarse entre sí y analizaremos su funcionamiento. Tendremos una quinta máquina (Ubuntu Desktop) que hará de máquina de despliegue y servidor web con aplicaciones para monitorizar o hacer uso de la red. Por simplicidad y comodidad de interfaz solamente vamos a trabajar desde Ubuntu Desktop, conectándonos a las demás máquinas desde esa si hiciera falta.

Todo el código fuente se encuentra en https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak

Las máquinas están desplegadas para cada usuario en https://vdi.tknika.eus/login

Las cinco máquinas virtuales denominadas 'Besu nodo 1-5' (**solamente se van a utilizar 4 en este despliegue**) son máquinas Ubuntu Server donde lo único que se ha configurado es la dirección IP fija y el nombre del servidor. Lo que necesitemos instalar para la puesta en marcha de los nodos de la red blockchain se hará en el despliegue mediante **Ansible**.

La máquina virtual denominada 'Ubuntu Desktop' es un Ubuntu de escritorio donde lo único que se ha configurado es la dirección IP fija y se ha instalado Ansible para hacer el despliegue. Parte del despliegue se hace en la misma máquina, que actúa como servidor web para aplicaciones que hacen uso de la blockchain.

> **Nota:** Pega los comandos con facilidad en la máquina virtual visualizándola con SPICE y pegando con Ctrl. + Shift + V.

Para el despliegue vamos a utilizar la máquina denominada 'Ubuntu Desktop' siguiendo estos pasos:

1.- Asegurarnos de que todas las máquinas están encendidas, 5 en total.

2.- En la máquina Ubuntu Desktop arrancar el terminal y ejecutar: 

`git clone https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak.git`

`cd Ikastaroa_Blockchain_Sareak`

3.- Primero comprobamos la conectividad a las máquinas. Para ello con el primer comando añadimos sus claves a la lista de máquinas conocidas y con el segundo comando verificamos que Ansible tiene acceso a ellas (tenemos que recibir un SUCCESS por cada máquina):

`ssh-keyscan -t ed25519 -H 192.168.100.1 192.168.100.2 192.168.100.3 192.168.100.4 192.168.100.5 >> ~/.ssh/known_hosts`

`ansible -i Hedapena/inventory.yml -m ping all --ask-pass`

4.- Si la conectividad a los nodos va bien, ejecutamos un **Playbook de Ansible** para hacer el despliegue completo, introduciendo solamente la contraseña de acceso a las máquinas cuando nos lo pida:

`ansible-playbook -i Hedapena/inventory.yml Hedapena/hedapena-AnsiblePlaybook.yml --ask-become-pass`

Tardará un tiempo en hacer todo el despliegue. Si todo ha ido bien al final de la tarea obtendremos un mensaje parecido a éste:

![Ansible OK](../baliabideak/ansible_ok.jpg)

Si algo ha fallado tendríamos que mirar el error pero no hay problema en volver a ejecutar el comando, Ansible se saltará las tareas que ya haya realizado bien.

Podemos comprobar que la red está en marcha accediendo a la dirección `localhost` o `ethstats.localhost` en el navegador del Ubuntu Desktop. Veremos algo así:

![Ethstats](../baliabideak/ethstats.jpg)

Esto es lo que ha ocurrido en el proceso de despliegue con Ansible:

1. Antes de nada todo el código necesario para el despliegue e instalación lo hemos descargado de [Github](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak) con el el comando `git clone ...`.


2. Las máquinas implicadas en el despliegue están definidas en el fichero [`Hedapena/inventory.yml`](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/inventory.yml) del repositorio. Ahí es donde se define su IP y están clasificadas por grupos (besu_nodes, webserver) para diferenciarlos a la hora de desplegar los contenidos.


3. Como Ansible necesita acceso *ssh* a las máquinas, mediante el comando `ssh-keyscan` hemos añadido las máquinas remotas a la lista de máquinas conocidas y con el comando `ansible -i Hedapena/inventory.yml -m ping all --ask-pass` hemos comprobado que tiene acceso a las máquinas implicadas en el despliegue.


4. Ejecutamos el **playbook** de Ansible definido en [`Hedapena/hedapena-AnsiblePlaybook.yml`](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/hedapena-AnsiblePlaybook.yml). El playbook consiste el llevar a cabo tres tareas:


   4.1. Instalar Docker y Docker Compose en todas las máquinas: mediante la propiedad 'hosts: all_servers' se indica que afecta a todas las máquinas definidas en el inventario. Se solicita la contraseña del usuario 'isard' y se ejecutan 4 subtareas:

    - Guardar la contraseña en una variable para no tener que volver a pedirla.
    - Instalar los paquetes docker.io y docker-compose-v2.
    - Iniciar el servicio Docker.
    - Añadir el usuario 'isard' al grupo 'docker'.


   4.2. Desplegar el servidor web e inicar los servicios: mediante la propiedad 'hosts: webserver' se indica que las tareas asociadas se van a llevar a cabo solamente en las máquinas que pertenezcan al grupo webserver, en este caso la máquina con IP 192.168.100.10 que es la misma que estamos utilizando para realizar el despliegue. Las subtareas son:
    - Crear la carpeta 'web'.
    - Copiar la carpeta 'WebServer' dentro de la carpeta 'web' en destino.
    - Copiar la carpeta 'Pilotoak' dentro de la carpeta 'web' en destino.
    - Asegurarse de que la carpeta 'web' en destino y todas las subcarpetas pertenecen al usuario 'isard'.
    - Mediante Docker iniciar el servidor web y otros servicios definidos en el fichero WebServer/docker-compose.yml


   4.3. Desplegar Hyperledger Besu el los cuatro nodos: mediante la propiedad 'hosts: besu_nodes' se indica que las tareas asociadas se van a llevar a cabo solamente en las máquinas que pertenezcan al grupo *besu_nodes*. Las subtareas son:
    - Crear la estructura de carpetas necesaria en ~/besuNode.
    - Copiar los ficheros que son comunes a todos los nodos.
    - Copiar los ficheros específicos de cada nodo (utilizando el índice).
    - Asegurarse de que la carpeta 'besuNode' en destino y todas las subcarpetas pertenecen al usuario 'isard'.
    - Mediante Docker iniciar Besu en cada máquina. En este caso, como para cada máquina hay que desplegar un fichero distinto, se hace referencia al número en el nombre de fichero con el número de índice definido en *inventory.yml*.

**El ejercicio consiste en:**

**1.** Sigue todos los pasos descritos para desplegar la red blockchain preconfigurada.
Entrega una captura del Ethstats con todos los nodos en marcha y generando bloques.


**2.** Accede a uno de los nodos (mediante ssh desde el Ubuntu Desktop para mayor comodidad) y echar abajo el servicio manualmente para observar que la red sigue creando bloques.
  - Ejecuta `ssh isard@192.168.100.1` y dentro de la carpeta besuNode `docker compose -f docker-compose1.yml down`
  - Sal de la conexión al servidor con `exit`.
  - Observa Ethstats en el navegador.
  - Entrega una captura del Ethstats con 3 nodos en marcha pero creando bloques ('Last block' con menos de 10 segundos).


**3.** Accede a otro de los nodos y echa abajo el servicio para observar que la red ya no produce más bloques.
  - Ejecuta `ssh isard@192.168.100.2` y dentro de la carpeta besuNode `docker compose -f docker-compose2.yml down`
  - Sal de la conexión al servidor con `exit`.
  - Observa Ethstats en el navegador.
  - Entrega una captura del Ethstats con 2 nodos en marcha y sin crear nuevos bloques ('Last block' con más de 10 segundos).


**4.** Reactiva el servicio en los dos nodos para ver que la red ha retomado la creación de bloques (puede tardar un tiempo en retomar la creación de nuevos bloques, unos 5 minutos en este entorno).
  - Ejecuta `ssh isard@192.168.100.1` y dentro de la carpeta besuNode `docker compose -f docker-compose1.yml up -d`
  - Sal de la conexión al servidor con `exit`.
  - Ejecuta `ssh isard@192.168.100.2` y dentro de la carpeta besuNode `docker compose -f docker-compose2.yml up -d`
  - Sal de la conexión al servidor con `exit`.
  - Observa Ethstats en el navegador.
  - Entrega una captura del Ethstats con todos los nodos en marcha y generando bloques (el número de bloque tendrá que ser mayor que el de la captura del apartado anterior y 'Last block' con menos de 10 segundos).


**5.** Despliega un Smart Contract. Para comprobar que nuestra red ya está operativa y se pueden hacer transacciones, vamos a ejecutar un script que despliega e invoca un contrato ya compilado:
  - Ve a la carpeta de contratos con `cd ~/Ikastaroa_Blockchain_Sareak/Garapena/Kontratuak/Formularioak`. Ahí se encuentran los ficheros *.sol*, *.abi* y *.bytecode* de un contrato llamado Formularioak.
  - Ejecuta `python ./hedatu_erabili.py`.
  - Identifica en los mensajes la dirección donde se ha desplegado el contrato y cópialo del terminal (Ctrl. + Mayúsc. + C).
  - Abre con el navegador el fichero `trazabilitatea.html` que se encuentra en la misma carpeta e introduce la dirección del contrato. El número de formulario es 1.
  - Entrega una captura de la página web donde se vea que se ha recuperado los datos del formulario para ese contrato.


**6.** Utiliza un explorador de bloques e identifica dónde están los datos de una transacción. La útima transacción del ejercicio anterior actualiza el formulario 1 con la información 'Dato final 1' y 'Dato final 2'. Se puede ver en qué número de bloque ha ocurrido esa transacción.
  - Accede en el navegador a `esploratzaile.localhost` y busca el número de bloque donde ha ocurrido esa transacción.
  - Entrega una captura con los datos de ese bloque. Tienen que aparecer 'Dato final 1' y 'Dato final 2'.


En la próxima sección estudiaremos dónde se han configurado los distintos aspectos de la red blockchain desplegada.

---

# Parte 4: Configuración de redes Blockchain

## 4.1 Software necesario en las máquinas

La máquina Ubuntu Desktop con la que estamos trabajando ya trae instalado lo siguiente:

- Ansible 2.17.14 (para el despliegue)
- Java 25 (para utilizar las herramientas de Besu)
- Hyperledger Besu 26.2.0 (el software con las herramientas, no un nodo)
- Python 3.10.12 (para ejecutar el despliegue del smart-contract y generar algunas claves)

Las máquinas Ubuntu Server (Besu node 1-5) no traen nada instalado.

## 4.2 Estructura y contenido de los ficheros de configuración en los nodos Besu

En nuestro caso estamos desplegando una red Hyperledger Besu en cuatro nodos.

Para cada nodo los ficheros están estructurados en la carpeta de despliegue (besu) de esta manera:

![Tree](../baliabideak/tree.jpg)

Como se ha visto en el apartado anterior, el despliegue en cada nodo consiste en iniciar un servicio Docker definido en cada fichero **docker-composeX.yml**.

En el fichero [docker-composeX.yml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/docker-compose1.yml) se define la imagen Docker que se va a desplegar en el nodo (en los comentarios se describe lo que hace cada línea de configuración) y sus características. **Echa un vistazo al enlace proporcionado para entender lo que viene configurado**.

Partiendo de este fichero veamos su relación con los demás ficheros fundamentales de la configuración:

- **[node-config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/configNodes/node-config.toml)**: el fichero de configuración que define las características del nodo. El significado de cada parámetro viene brevemente explicado en un comentario, **accede al enlace proporcionado para verlo**. Es el núcleo de la configuración de cada nodo y como vemos en él se hace referencia a los siguientes ficheros:
  - **[genesis.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/genesis.json)**: fichero que define el bloque inicial y la configuración de la cadena.
  - **publicRSAKeyOperator.pem**: clave pública usada para verificar los tokens de acceso JWT.
  - **[static-nodes.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/static-nodes.json)**: fichero con la lista de nodos conocidos con los que conectarse al arrancar. El listado consiste en las direcciones *enode* que corresponden a los nodos (**clave pública + IP:puerto**).
  - **[nodes_permissions_config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/nodes_permissions_config.toml)**: si en *node-config.toml* hemos activado el permisionado por nodos, en este fichero se indican las direcciones de los nodos que tienen permiso para comunicarse con este nodo. El listado consiste en las direcciones *enode* que corresponden a los nodos (**clave pública + IP:puerto**)
  - **[accounts_permissions_config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/accounts_permissions_config.toml)**: si en *node-config.toml* hemos activado el permisionado por direcciones, en este fichero se indican las direcciones que tienen permiso para enviar transacciones al nodo (desactivado en nuestro caso).

- **networkFiles/keys/keyX**: clave privada de cada nodo que lo identifica de forma única.

## 4.3 Creación de ficheros con herramientas de Besu y scripts

### Generar nuevas direcciones

Las direcciones en blockchain funcionan de forma similar a un número de cuenta bancaria, pero en redes como Ethereum o Besu. Una dirección identifica de manera única a un usuario, contrato u entidad dentro de la red: es una cadena de caracteres generada a partir de una clave pública, que a su vez solo puede ser utilizada por quien conoce la clave privada correspondiente. 

Estas direcciones permiten enviar y recibir fondos, gestionar permisos, o ejecutar contratos inteligentes. Resultan esenciales para la seguridad y el control de acceso, porque solo el propietario de la clave privada puede autorizar operaciones sobre esa dirección (por ejemplo, firmar transacciones).

Con Besu instalado podemos crear tantas nuevas direcciones como queramos para asignarles una cantidad de ETH inicial en el bloque génesis. Podemos hacerlo con estos comandos:

`besu --data-path=./address_1 public-key export --to=./address_1/key.pub`

`besu --data-path=./address_1 public-key export-address --to=./address_1/address`

Esto nos va a crear en la carpeta 'address_1' tres ficheros:
- La clave privada (key).
- La clave pública (key.pub).
- La dirección (address, se deriva de la clave pública).

> Crea tres conjuntos de claves/direcciones como prueba, serán útiles para el último ejercicio. Estarán en las carpetas address_1, address_2 y address_3

### Generar genesis.json y claves de nodos

El fichero **[genesis.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/genesis.json)** es un archivo fundamental que define el bloque inicial ("bloque génesis") y la configuración de la cadena de bloques que será utilizada por todos los nodos de la red. Es el punto de partida de la blockchain: en él se establecen los parámetros de funcionamiento de la cadena (algoritmo de consenso, tiempo entre bloques, cuentas con saldo inicial…) y define las reglas bajo las que operará la red.

**¿Qué campos contiene genesis.json?**

- `config`: Define la identidad y las reglas de la red. Aquí se indica, por ejemplo, el `chainId`, la activación de hardforks (`londonBlock`) y la configuración del consenso `qbft` (`blockperiodseconds`, `epochlength`, `requesttimeoutseconds`).
- `nonce`: Valor heredado del formato de génesis de Ethereum. En redes Besu con QBFT suele fijarse a `0x0` y no se usa para minado.
- `timestamp`: Marca temporal del bloque génesis. Solo afecta al bloque inicial y debe coincidir en todos los nodos.
- `gasLimit`: Límite máximo de gas por bloque a partir del arranque de la red. Condiciona cuántas transacciones o cuánto trabajo puede entrar en cada bloque.
- `difficulty`: Campo heredado de redes basadas en prueba de trabajo. En QBFT no se usa para competir por minado, por lo que normalmente se deja con un valor fijo como `0x1`.
- `mixHash`: Campo heredado de Ethereum que, en QBFT, toma un valor constante para identificar el tipo de consenso utilizado.
- `coinbase`: Dirección asociada al beneficiario del bloque. En este contexto suele ponerse a `0x0000000000000000000000000000000000000000`.
- `alloc`: Estado inicial de cuentas. Permite asignar balances desde el primer bloque y, en ficheros generados para laboratorio, puede incluir también campos auxiliares como `privateKey` o `comment`, aunque la red solo utiliza el balance y la dirección.
- `extraData`: Campo clave en redes QBFT. Incluye los datos extra del bloque génesis y, especialmente, la información necesaria para fijar los validadores iniciales de la red.
  
Este fichero debe ser idéntico en todos los nodos para que pertenezcan a la misma red.

[Aquí](https://besu.hyperledger.org/private-networks/how-to/configure/consensus/qbft) más información acerca de qué signican esos campos y cómo se configuran.

**¿Cómo se genera?**

Se crea automáticamente a partir de un fichero de configuración como **[qbftConfigFile.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/qbftConfigFile.json)**, que define parámetros como el tipo de consenso (por ejemplo, QBFT), el número de nodos validadores y otros ajustes iniciales. El comando de Besu:

`besu operator generate-blockchain-config --config-file=qbftConfigFile.json --to=networkFilesNEW --private-key-file-name=key`

toma ese archivo de configuración y genera en la carpeta de salida (*networkFilesNEW* en este caso para no sobreescribir la existente *networkFiles*) el **genesis.json** junto con las claves y direcciones de los nodos. Las claves (fichero *key*) de los nodos que van a formar parte de la red están cada una en una carpeta distinta cuyo nombre es la dirección asociada a esa clave.

> Ve a la carpeta donde se encuentra qbftConfigFile.json (Ikastaroa_Blockchain_Sareak/Hedapena) y ejecuta el comando para ver cómo se crean los ficheros mencionados dentro de la carpeta networkFilesNEW. Una de las claves te vendrá bien para el ejercicio que se plantea al final.

Para arrancar cada nodo en realidad solamente necesitamos ese fichero *key*, con la configuración que estamos utilizando basta con copiarlo a *networkFiles/keys* como *keyX* (siendo X el índice del nodo) para que se referencie desde el *docker-composeX.yml* de cada nodo.

La otra clave que se genera para cada nodo, *key.pub*, es la clave con la que se va a identificar el nodo junto con la IP en las direcciones *enode* antes mencionadas.

### Claves RSA y generación de tokens JWT

Para la seguridad y la autenticación de la red intervienen dos claves RSA y el propio token JWT. En la configuración que hemos desplegado, parte de las API del nodo, concreatmente las orientadas a tareas administrativas, están preparadas para ser accesibles solo mediante autenticación. Por ello, cada nodo debería disponer de sus propias claves y de los tokens JWT asociados para operar de forma segura:

- **privateRSAKeyOperator**: Es la **clave privada RSA** que se usa para **firmar** el token JWT. Debe mantenerse protegida y nunca compartirse.
- **publicRSAKeyOperator**: Es la **clave pública RSA** asociada a la anterior. Se distribuye al nodo para que pueda verificar que el token JWT ha sido firmado con la clave privada correcta.
- **tokens JWT (JSON Web Tokens)**: Son tokens que incluyen información de autenticación, como los permisos de acceso a APIs y la fecha de expiración. El token se crea con esos datos y después se **firma con la clave privada**. Se pueden crear tantos token JWT como se quieran con distintas características, con distintos niveles de acceso según el usuario por ejemplo.

**Proceso de creación y uso del JWT:**  
1. Se genera un par de claves RSA: una **clave privada** y una **clave pública**.  
2. La **clave privada** se guarda en el sistema que va a emitir el token JWT.  
3. La **clave pública** se copia al nodo para que pueda validar la firma del token.
4. Se crea el JWT con los datos necesarios, por ejemplo los permisos y la fecha de expiración.
5. Ese JWT se **firma con la clave privada**.  
6. El usuario o la aplicación envía el token al conectarse a la API protegida del nodo.
7. El nodo verifica la firma con la **clave pública**. Si la firma es válida y el token no ha caducado, permite la operación.

El script `Garapena/Erremintak/JWT/sortu_JWT.py` automatiza este proceso para un nodo `X`. Al ejecutarlo pasándole ese número como argumento, crea una carpeta `X` en el directorio actual y genera dentro:

- `privateRSAKeyOperatorX.pem`
- `publicRSAKeyOperatorX.pem`
- `JWT_X`

Por defecto crea un token que da acceso a todas las API por tiempo indefinido pero se puede configurar cambiando el script si quisiéramos crear un token con permisos más limitados.

> Para probarlo cambia de carpeta con `cd ~/Ikastaroa_Blockchain_Sareak/Garapena/Erremintak/JWT` y ejecuta `python ./sortu_JWT.py 5` para crear nuevas del nodo 5 claves dentro de la carpeta '5'. Te vendrá bien para el ejercicio propuesto más adelante.

## 4.4 Comunicación entre nodos

La comunicación entre nodos en una red blockchain como Hyperledger Besu es esencial para el funcionamiento y la seguridad de la red. Aquí se destacan algunos puntos clave relevantes sobre este aspecto:

### Red P2P (Peer-to-Peer)

Todos los nodos de la red se conectan entre sí utilizando un protocolo P2P, en el caso de Besu el protocolo devp2p (compatible con Ethereum). Esto permite el intercambio de bloques, transacciones y mensajes de consenso entre los diferentes actores, facilitando la propagación rápida de la información.

### Descubrimiento de nodos

En Besu hay varias formas de conseguir que un nodo encuentre a otros nodos de la red:

- **`static-nodes.json`:** Sirve para indicar de forma explícita a qué nodos queremos que se conecte. Es la opción más directa y predecible en redes privadas, porque permite fijar manualmente la lista de validadores o nodos conocidos.

- **`bootnodes`:** Son nodos de entrada inicial. No representan necesariamente todos los nodos de la red, sino algunos puntos de arranque a partir de los cuales un nodo puede empezar a descubrir otros peers.

> **Diferencia principal:** `static-nodes.json` define conexiones conocidas y estables desde el principio, mientras que `bootnodes` solo ayudan a arrancar el proceso de descubrimiento.

> **Efecto de la opción `discovery-enabled`:** Cuando está activada (en *node-config.toml*), el nodo puede descubrir nuevos peers automáticamente a partir de otros nodos conocidos. Cuando está desactivada, el nodo no hace ese descubrimiento dinámico y depende mucho más de listas explícitas como `static-nodes.json`.


- Enode:
  Es una URL que identifica de forma única un nodo de Ethereum/Besu, e incluye:
  - La clave pública del nodo.
  - La IP o dominio donde reside el nodo.
  - El puerto TCP y UDP donde escucha conexiones.
  
  Formato de enode:
  `enode://<clavepublica_hex>@<ip>:<tcpport>?discport=<udpport>`

- **Puertos utilizados:** 
  - Por defecto, los nodos escuchan en el puerto 30303 (TCP y UDP) para conexiones P2P.
  - Los servicios API (RPC HTTP y WebSocket) suelen publicarse en 8545 (HTTP) y 8546 (WS), aunque pueden configurarse.

- **Firewall y conectividad:** 
  - Es importante que los puertos P2P estén abiertos entre los nodos de la red para permitir la comunicación directa.
  - En entornos cloud o de laboratorio, se deben ajustar las reglas de firewall para no bloquear estos puertos.

- **Detección y resolución de nodos:** 
  - En redes permisionadas, la topología estática (conexión por *static-nodes.json*) es lo habitual para garantizar quién puede participar y minimizar la exposición. 
  - En redes públicas o abiertas, se puede emplear el descubrimiento (opción `discovery-enabled`).

- **Comprobaciones útiles:**
  - Los logs de Besu indican a qué enodes está conectado un nodo.
  - Los comandos de la consola RPC/API permiten consultar los peers conectados con métodos como `admin_peers`.

En resumen, la correcta configuración de la comunicación entre nodos es imprescindible para que el consenso funcione, la información circule rápidamente y la red sea resiliente ante caídas o desconexiones parciales. 

### APIs externas

Las APIs de Hyperledger Besu están organizadas en diferentes grupos que agrupan funcionalidades relacionadas. Cada grupo permite acceder a conjuntos de métodos específicos según el ámbito de operación. En el archivo de configuración `node-config.toml`, los grupos habituales son:

- **DEBUG:** Permite obtener información detallada para diagnosticar el estado interno del nodo y registrar mensajes para depuración.
- **ETH:** Incluye los métodos estándar de Ethereum, como la consulta de bloques, transacciones, balances y envío de transacciones.
- **TXPOOL:** Da acceso al estado del "transaction pool", es decir, las transacciones pendientes que aún no se han incluido en la cadena.
- **NET:** Proporciona información sobre el estado de la red, ID de la cadena, conexiones de red y estado de sincronización.
- **TRACE:** Permite ejecutar y obtener trazas de la ejecución de transacciones, útil para análisis de contratos inteligentes.
- **WEB3:** Proporciona utilidades básicas y de compatibilidad para la API de web3.
- **PLUGINS:** Relacionado con la extensión por plugins de Besu, permite exponer APIs adicionales facilitadas por plugins instalados.
- **ADMIN:** Acceso a métodos administrativos con privilegios elevados, como la gestión de peers y nodos, (solo disponible por WebSocket).
- **MINER:** Métodos relacionados con el minado (bloques PoW, en QBFT normalmente no se usa).
- **QBFT:** Métodos específicos para administrar y consultar el consenso QBFT, como propuestas de validadores y estado del consenso.
- **PERM:** Relacionado con la gestión de permisos de nodos y cuentas.

De esta forma se pueden habilitar o restringir grupos de APIs según las necesidades del despliegue, aumentando tanto la flexibilidad como la seguridad.

La referencia completa de los métodos disponibles se encuentra en la [página oficial](https://besu.hyperledger.org/public-networks/reference/api).

**Cómo invocar los métodos de la API**

En nuestro despliegue tenemos algunos grupos de API accesibles mediante HTTP en el puerto 8545 sin necesidad de autorización y por otra parte todos los grupos de API accesibles mediante Websocket en el puerto 8546 con autorización (token JWT). Todo esto viene configurado en el fichero [node-config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/configNodes/node-config.toml) de cada nodo.

Veamos un ejemplo de cada uno:

  - HTTP puerto 8545 sin autorización: ejecuta por ejemplo:

  `curl -X POST --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":53}' http://192.168.100.1:8545/ -H "Content-Type: application/json"`

  Invoca el método *net_peerCount* del [grupo NET](https://besu.hyperledger.org/public-networks/reference/api#net-methods) en el nodo con IP 192.168.100.1 y puerto 8545, que está accesible sin autenticación. La resuesta que veremos es:

  `{"jsonrpc":"2.0","id":53,"result":"0x3"}`

  Un 3, es decir, que el nodo tiene 3 peers.

  - Websocket puerto 8546 con autorización: es algo más complejo, tenemos que utilizar un programa (*websocat*, ya instalado) para iniciar la comunicación añadiéndole el token JWT_1 en la solicitud y luego invocar métodos. Sigue estos pasos para probarlo:
    
    `cd ~`
    
    `./websocat -H="Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJtaXNzaW9ucyI6WyIqOioiXSwicHJpdmFjeVB1YmxpY0tleSI6IjdxSHJ0RG85TVc0UHRPSXgrTkJDWWNqTTNqN0UzaU0rYUExL20rNmpzbnM9IiwiZXhwIjoxNjAwODk5OTk5MDAyfQ.drZxJPRxE3AQ5z5ws8gJ2E_q0zUqZM82QdXp1DREuXcdyskL0eqTCs0OVwvarlWpxFXJzXShEYzinNeLZrfPZHGReDYoQMoSuTNaI34REsVQ8zUqvUt2J9UNklKnGzOXZlZ6Z0nTVD69DviIb-GrLwJ4eiqLi9-AeqSI90DlQmubIuhLJZHPH0Y7NOWvLOJ-jcUddFGmzl9wonAnsmwBM3YDbpA3bWFtp5Cb8ZQox073-7kWmNjImnUljr8Uut_j1xdc5fIJxIBez7Q1v4rkia0SXSd6fC5OL7A9OgEiYmt7Xus8at__3luhVJfNIU8DaHFnXWtfosZgLtAa4Vykbw" ws://192.168.100.2:8546`

    Con eso iniciamos una conexión websocket al nodo 2, que se queda a la espera de comandos. Fíjate en que el formato es: `./websocat -H="Authorization: TOKEN_JWT" ws://192.168.100.2:8546`. Se ha utilizado el token JWT_2 en este caso (aunque son todos iguales en la red desplegada, por simplicidad)

    Cuando se quede a la espera de nuevos comandos, escribimos por ejemplo:

    `{"jsonrpc":"2.0","method":"qbft_getValidatorsByBlockNumber","params":["latest"], "id":1}`

    Esto invoca el método *qbft_getValidatorsByBlockNumber* del [grupo QBFT](https://besu.hyperledger.org/private-networks/reference/api#qbft-methods). Obtendremos una respuesta como esta:

    `{"jsonrpc":"2.0","id":1,"result":["0x867e3dcc2e546ab8d62ab8b25e6800c328ca2dd8","0x89b84b7fa93e429f2ce4632505074eed74e89351","0x92c83b4052230b836e100c42701cdc83d7baeb8a","0xc6261c951d52b563d6a91afb774db1c2516caac4"]}`

    Que son las direcciones (address) de los cuatro nodos que forman nuestra red. Esta respuesta significa que nos cuatro nodos han actuado como validadores del último bloque producido (en la llamada se indica "last").

De esta forma ya puedes invocar cualquier método de la API para obtener información o ejecutar operaciones administrativas.

> Comprueba que funcionan los ejemplos dados, el ejercicio final tendrás que hacer uso de estos métodos.

## 4.5 Seguridad en redes Blockchain

Repasemos las principales características y medidas de seguridad que se pueden implementar en la red blockchain. Algunas ya las hemos implementado en nuestra red y otras quedan como sugerencias para un despliegue en entorno de producción.

### Autenticación y autorización

- Control de acceso a nodos (mediante *nodes_permissions_config.toml*): restringir qué nodos pueden conectarse a cada nodo.
- Control de cuentas permitidas (mediante *accounts_permissions_config.toml*): restringir qué cuentas pueden operar en la red a la hora de hacer transacciones.
- Gestión de nodos validadores (propuestas y votaciones on-chain): decidir qué nodos van a ser validadores y añadir o quitarlos votando por mayoría.
- Acceso a APIs de administración de la red mediante JWT (JSON Web Tokens).
- Aplicar el principio de mínimo privilegio: no todos los usuarios o servicios deberían tener todos los permisos (`["*:*"]`) si no lo necesitan.
- Configurar una expiración razonable de los JWT y regenerarlos cuando sea necesario, en lugar de reutilizarlos indefinidamente.
- Limitar el acceso a las APIs administrativas a los canales estrictamente necesarios, evitando exponer más superficie de ataque de la imprescindible.

### Configuración segura del nodo

- Revisar qué APIs JSON-RPC se exponen por HTTP y por WebSocket, habilitando solo las necesarias.
- Evitar publicar interfaces administrativas en `0.0.0.0` si no es imprescindible o, si se hace, protegerlas con firewall, VPN o túneles SSH.
- Separar en lo posible los servicios P2P, RPC y métricas para controlar mejor qué clientes pueden acceder a cada puerto.
- Revisar periódicamente `static-nodes.json`, `bootnodes` y las listas de permisos para retirar nodos o accesos que ya no deban existir.


### Conectividad

- Uso de firewalls y restricción de puertos accesibles.
- Apertura únicamente de los puertos estrictamente necesarios para P2P, RPC y monitorización.
- Segmentación de red o uso de redes privadas/VPN para que los nodos no queden expuestos innecesariamente a Internet.
- Restricción por IP o por rango de red cuando se conozcan de antemano los equipos que deben conectarse.

### Monitorización y respuesta ante incidentes

- Supervisar logs, número de peers, sincronización y uso de recursos para detectar comportamientos anómalos.
- Revisar intentos de acceso fallidos a las APIs, desconexiones inesperadas y cambios no previstos en el conjunto de validadores.
- Definir procedimientos de respuesta: revocar JWT, rotar claves, cerrar puertos o aislar nodos comprometidos.

### Mantenimiento y operación segura

- Las claves privadas nunca deben exponerse; las direcciones derivan de la clave pública.
- Las claves privadas de cuentas, nodos y JWT deben almacenarse con permisos de acceso mínimos y nunca en repositorios públicos.
- Conviene rotar las claves de acceso administrativo si existe sospecha de compromiso o cuando cambian las personas responsables.
- Mantener Besu, el sistema operativo y las herramientas auxiliares actualizados para corregir vulnerabilidades conocidas.
- Hacer copias de seguridad de los ficheros críticos de configuración y de las claves que sea necesario conservar, protegiéndolas adecuadamente.
- Documentar quién tiene acceso administrativo a cada nodo y reducir al mínimo el número de credenciales con privilegios elevados.


## 4.6 Monitorización y mantenimiento

### Indicadores clave

- Estado de sincronización de cada nodo (`eth_syncing`).
- Número de peers conectados en cada nodo (`net_peerCount`).
- Tiempo desde el último bloque (`eth_getBlockByNumber(["latest", false])`) observando el campo `timestamp` y comparándolo con la hora actual.
- Uso de recursos del sistema (CPU, disco, memoria).
- Estado del consenso y producción de bloques, para detectar si la red sigue avanzando con normalidad.
- Errores repetidos en los logs, desconexiones frecuentes o caídas del número de peers.

### Herramientas

- Logs de Besu (mediante `docker logs`)
- Ethstats (mediante la aplicación web).
- Prometheus + Grafana para métricas (no implementado en nuestro despliegue).
- Alertas: Conviene definir alertas para situaciones como “número de peers por debajo de un umbral”, “bloqueo en la producción de bloques”, “falta de sincronización” o “uso elevado de CPU, memoria o disco” (no implementado en nuestro despliegue).

### Buenas prácticas

- Revisar periódicamente los logs tras reinicios, cambios de configuración o despliegues.
- Vigilar el espacio en disco y el crecimiento de datos y logs para evitar paradas inesperadas.
- Verificar después de cada cambio que el nodo sigue sincronizado, mantiene peers y responde correctamente por RPC.

**Ejercicio: 1.- añadir un quinto nodo a la red y  2.- Convertirlo en validador con votos en los demás nodos.**

Para añadir un quinto nodo tendrás que:

- Crear las claves y dirección del nodo (comando *besu*). Copiar esa clave como **key5** a networkFiles/keys
- Crear el fichero JWT_5 en networkFiles/JWTkeys (solamente crear una copia de los existentes, van a ser todos iguales en este despliegue por simplicidad). No es imprescindible.
- Añadir el *enode* a los ficheros *static-nodes.json* y *nodes_permissions_config.toml*.
- Modificar el fichero *inventory.yml* para añadir el nuevo nodo. En principio no necesitamos tocal el Playbook de Ansible porque el procedimiento es el mismo.
- Crear un nuevo docker-compose5.yml adaptado al nodo 5.
- Ejecutar el Playbook de Ansible.
- Comprobar en Ethstats que el nuevo nodo forma parte de la red.
- **Entrega:** una captura del Ethstats donde se vean los 5 nodos en funcionamiento y creando bloques (el tiempo desde que se creó el último bloque tiene que ser menor de 10s.)

Convertir el quinto nodo en validador:

- Comprueba (comando de Websocket `qbft_getValidatorsByBlockNumber` visto anteriormente)que a pesar de tener 5 nodos, los bloques solamente los validan 4 nodos distintos, los 4 originales.
- Busca en la [documentación](https://besu.hyperledger.org/private-networks/reference/api#qbft-methods) qué comando hay que ejecutar en los nodos que ya son validadores para proponer el nuevo nodo como validador.
- Ejecuta el comando necesario en al menos 3 nodos (mayoría) para añadir el quinto nodo como validador. Ahora en los nuevos bloques tienen que aparece 5 nodos como validadores.
- Entrega: una captura en la que se vea que el nuevo nodo está entre los validadores del último bloque producido (el comando más la respuesta)

---

# Parte 5: Configuración y despliegue de una red Blockchain

Este apartado es un ejercicio final que consiste en hacer un nuevo despliegue teniendo en cuenta todo lo todo lo visto hasta ahora. Las características del despliegue a realizar son éstas:
- 2 nodos (las direcciones IP son 192.168.100.1-2).
- El tiempo entre bloques será de 20 segundos.
- Las claves propias de cada nodo son nuevas y distintas entre sí.
- Los token JWT son distintos en cada nodo y generados a partir de claves privadas distintas.
- Solamente esos dos nodos pueden participar en la red.
- Las estadísticas al Ethstats los nodos las mandan con estos nombres: *2nodeNetwork_1* y *2nodeNetwork_2*


Ten en cuenta que prácticamente todos los ficheros de configuración se verán afectados y hay que recrearlos.

Para el despliegue se recomienda hacer pequeñas modificaciones a los ficheros existentes de despliegue con Ansible (*hedapena-AnsiblePlaybook.yml* y *inventory.yml*) para adaptarlo al ejercicio. 

**Recrea las máquinas 1 y 2** para que vuelvan a su estado inicial y hacer un despliegue limpio (se eliminará lo que esté desplegado o modificado):

![Recreate](../baliabideak/recreate.jpg)

**Apaga las máquinas 'Besu node 3-5'** dado que no hacen falta y si están en marcha pueden estar mandando datos a Ethstats.

Nota: una vez hecho el despliegue, si no hay errores, la red puede tardar unos 10-15 minutos en empezar a generar bloques pero los dos nodos deberían verse en Ethstats.

**Entrega: captura(s) del Ethstats donde se vean los dos nodos activos, generando bloques (tiempo desde el último bloque < 20 segundos) y en el apartado 'Active Nodes' (arriba a la derecha) se ve 2/2** 

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
| **Hard fork** | Modificación importante y no retrocompatible del protocolo, que obliga a actualizar los nodos. En Ethereum, los hard forks se utilizan para introducir nuevas funcionalidades o corregir errores críticos. |
| **Byzantine Fault Tolerance (BFT)** | Capacidad de una red distribuida para seguir operando correctamente incluso si algunos de sus nodos actúan de forma maliciosa o fallan de manera arbitraria. En blockchain, es crucial para que el consenso sea seguro frente a fallos o ataques de nodos. |
| **RPC** | Remote Procedure Call. Un protocolo que permite a un programa ejecutar funciones o procedimientos en otra máquina de la red como si fueran locales, facilitando la comunicación entre cliente y servidor en sistemas distribuidos. |
| **JSON** | JavaScript Object Notation. Un formato ligero para el intercambio de datos, legible por humanos y fácilmente parseable por máquinas. Es utilizado comúnmente para enviar datos estructurados entre cliente y servidor. |
| **Websocket** | Protocolo que permite una comunicación bidireccional y persistente a través de una única conexión TCP entre cliente y servidor. Es muy usado en aplicaciones que requieren actualización en tiempo real, como dashboards blockchain (Ethstats, exploradores). |
| **API** | Application Programming Interface. Conjunto de definiciones y protocolos que permite a una aplicación comunicarse e interactuar con otra, facilitando el acceso a funcionalidades o datos específicos sin conocer su implementación interna. |

---