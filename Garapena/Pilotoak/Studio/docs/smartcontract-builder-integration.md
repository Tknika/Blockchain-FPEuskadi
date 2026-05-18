# Integracion del SmartContract Builder

## Objetivo

Integrar una funcionalidad visual basada en Blockly dentro de la aplicacion actual para que el usuario pueda:

- construir un contrato visualmente,
- generar Solidity,
- revisar el codigo,
- enviar ese codigo a la pipeline actual de compilacion y despliegue,
- conservar el workspace Blockly para seguir editandolo mas tarde.

La integracion debe respetar la arquitectura existente:

- backend Express responsable de la compilacion oficial con `solc`,
- frontend React + Ethers responsable de wallet, despliegue e interaccion ABI,
- despliegue en Docker con frontend servido por Nginx.

## Recomendacion principal

La mejor integracion real en este proyecto es un enfoque de micro-frontend embebido dentro del frontend actual:

- mantener SmartContract Builder como aplicacion estatica aislada,
- servirla desde el mismo contenedor frontend,
- embeberla en React mediante `iframe`,
- comunicar Builder y Playground mediante `window.postMessage`,
- compilar siempre en el backend actual antes de permitir despliegue.

Este enfoque es preferible a reescribir Blockly dentro de React por cuatro motivos:

1. reduce el riesgo de romper la aplicacion actual,
2. evita conflictos de CSS, scripts globales y carga de Blockly,
3. permite evolucionar Builder de forma independiente,
4. mantiene una frontera tecnica clara entre edicion visual y pipeline Web3.

## Principio clave

La compilacion del navegador dentro de Builder debe considerarse solo una validacion preliminar de UX.

La compilacion oficial para despliegue debe seguir pasando por el backend Express, porque es el punto donde hoy ya se garantiza:

- version controlada de `solc`,
- `evmVersion: london`,
- ABI y bytecode consistentes con el despliegue real,
- mensajes de error normalizados.

## Cambios recomendados en frontend

### 1. Separar la UI actual en vistas funcionales

El `App.tsx` actual concentra demasiada logica. Antes de integrar Builder conviene extraer estas piezas:

- `SourceIntakePanel`: origen del contrato, ya sea subida manual o Builder,
- `CompilePanel`: compilacion y seleccion de contrato,
- `DeployPanel`: despliegue con wallet,
- `InteractionPanel`: formularios dinamicos desde ABI,
- `SmartContractBuilderFrame`: contenedor del `iframe` y coordinacion con Builder.

No es solo una mejora estetica. Esta separacion simplifica el estado compartido y evita que la integracion de Blockly convierta el componente principal en un cuello de botella de mantenimiento.

### 2. Añadir un selector de modo de entrada

La home del frontend debe ofrecer dos caminos visibles:

- `Subir .sol`
- `SmartContract Builder`

Comportamiento esperado:

- si el usuario sube un `.sol`, se usa el flujo actual,
- si el usuario abre Builder, se muestra el editor visual y un boton `Enviar al Playground`,
- cuando Builder exporta Solidity, ese codigo se convierte en el nuevo origen activo de compilacion.

### 3. Crear un estado de contrato fuente unificado

El frontend debe dejar de pensar solo en `File` y pasar a manejar una entidad comun:

```ts
type ContractSource = {
  origin: "upload" | "builder";
  fileName: string;
  sourceCode: string;
  templateId?: "storage" | "erc20" | "erc721" | "voting" | "blank";
  workspaceSnapshot?: string;
  updatedAt: string;
};
```

Beneficio:

- el pipeline de compilacion y despliegue ya no depende del origen,
- Builder y upload manual convergen en la misma estructura,
- se puede persistir y restaurar el trabajo visual sin mezclarlo con ABI o bytecode.

### 4. Integrar Builder via `iframe`

El frontend React debe renderizar un componente como este a nivel conceptual:

```tsx
<SmartContractBuilderFrame
  src="/builder/index.html"
  onExport={(payload) => setContractSource(payload)}
/>
```

El `iframe` permite aislar:

- dependencias JS de Blockly,
- estilos del builder,
- plantillas y utilidades legacy en HTML/CSS/JS,
- rendimiento del canvas visual.

## Contrato de comunicacion entre Builder y Playground

La integracion debe basarse en mensajes explicitamente tipados.

### Mensaje enviado por Builder al Playground

```ts
type BuilderExportMessage = {
  type: "builder:export-solidity";
  payload: {
    fileName: string;
    sourceCode: string;
    templateId: "storage" | "erc20" | "erc721" | "voting" | "blank";
    workspaceSnapshot: string;
    builderVersion: string;
  };
};
```

### Mensaje opcional del Playground al Builder

```ts
type BuilderLoadMessage = {
  type: "playground:load-workspace";
  payload: {
    workspaceSnapshot?: string;
    templateId?: string;
  };
};
```

### Reglas de seguridad

- validar `event.origin`,
- validar `event.data.type`,
- rechazar payloads sin `sourceCode` o `fileName`,
- imponer un limite de tamaño razonable al codigo y al workspace serializado.

## Cambios recomendados en backend

El backend actual solo compila ficheros enviados como multipart. Para Builder eso funciona, pero no es el mejor contrato.

La recomendacion es añadir un segundo endpoint JSON:

### Nuevo endpoint

`POST /api/compile/source`

```json
{
  "fileName": "Voting.sol",
  "sourceCode": "pragma solidity ^0.8.20; ...",
  "metadata": {
    "origin": "builder",
    "templateId": "voting"
  }
}
```

### Ventajas sobre reutilizar el upload multipart

1. evita crear `Blob` o `File` artificiales en React,
2. desacopla el origen visual del mecanismo de subida,
3. facilita trazabilidad futura,
4. permite registrar metadata del Builder sin ensuciar el compilador.

### Recomendacion de implementacion

No dupliques la logica de compilacion. Extrae una funcion compartida en backend, por ejemplo:

```ts
compileSolidity({ fileName, sourceCode })
```

y usa esa funcion tanto desde:

- `POST /api/compile`
- `POST /api/compile/source`

## Flujo end-to-end recomendado

### Flujo principal

1. El usuario entra en `SmartContract Builder`.
2. Selecciona plantilla `Storage`, `ERC20`, `ERC721`, `Voting` o `Blank`.
3. Builder genera Solidity y workspace serializado.
4. El usuario pulsa `Enviar al Playground`.
5. Builder manda `builder:export-solidity` al frontend React.
6. React crea un `ContractSource` con `origin: "builder"`.
7. React llama a `POST /api/compile/source`.
8. El backend compila con `solc` y devuelve ABI/bytecode.
9. El flujo actual continua sin cambios: seleccion de contrato, constructor, despliegue, ABI interaction.

### Flujo secundario: ida y vuelta

Tambien conviene permitir volver a Builder desde el Playground con el workspace ya cargado:

1. El usuario compila desde Builder.
2. Ve errores de compilacion oficiales del backend.
3. Pulsa `Volver a Builder`.
4. React reabre el `iframe` y le envia `playground:load-workspace`.
5. Builder restaura el workspace y el usuario sigue editando.

Este ida y vuelta es lo que convierte la integracion en un flujo real de producto, no en una exportacion aislada.

## Cambios recomendados en interfaz grafica

La UI debe dejar de ser una secuencia fija de tres pasos y pasar a una experiencia de dos capas.

### Capa 1: origen del contrato

- tarjeta o tabs superiores:
  - `Subir Solidity`
  - `SmartContract Builder`

### Capa 2: pipeline Web3

- `Compilar`
- `Desplegar`
- `Interactuar`

### Comportamiento visual sugerido

- si el origen es `upload`, se muestra el input de fichero actual,
- si el origen es `builder`, se muestra el `iframe` y las acciones de exportacion,
- una vez exportado el Solidity, se resalta una tarjeta resumen con:
  - nombre del contrato,
  - plantilla usada,
  - fecha de generacion,
  - origen `Builder`,
  - boton `Compilar en Playground`.

### Acciones visibles dentro de Builder

Builder puede seguir manteniendo:

- copiar codigo,
- descargar `.sol`,
- abrir en Remix,
- guardar workspace.

Pero la accion principal dentro del producto debe ser una nueva CTA:

- `Usar en Playground`

Ese boton debe convertirse en la accion canonica para pasar del modo visual al despliegue real.

## Persistencia recomendada

### Minimo viable

- guardar `workspaceSnapshot` y `sourceCode` en `localStorage` del frontend.

Claves sugeridas:

- `builder.workspace`
- `builder.source`
- `builder.templateId`

### Evolucion futura

Si mas adelante necesitas multiusuario o historico, entonces si tendria sentido un backend de persistencia. Hoy no hace falta para cumplir el objetivo de despliegue.

## Integracion Docker y despliegue

No hace falta un nuevo servicio en `docker-compose.yml` si Builder sigue siendo estatico.

La opcion recomendada es:

- empaquetar Builder dentro del mismo frontend,
- servir sus assets desde Nginx bajo una ruta como `/builder/`,
- dejar que React lo embeba con `iframe src="/builder/index.html"`.

Ventajas:

- un unico dominio,
- sin problemas de CORS para `postMessage` controlado,
- sin nuevo contenedor,
- menor complejidad operativa.

Solo recomendaria un contenedor independiente si Builder fuese a tener ciclo de despliegue propio, dependencias pesadas o un roadmap totalmente separado.

## Riesgos y mitigaciones

### Riesgo 1: divergencia entre validacion del navegador y compilacion oficial

Mitigacion:

- mostrar claramente que la validacion del Builder es preliminar,
- usar siempre el backend como fuente de verdad para ABI y bytecode.

### Riesgo 2: App.tsx creciendo demasiado

Mitigacion:

- extraer componentes antes de integrar Builder,
- centralizar el estado de `ContractSource`.

### Riesgo 3: acoplar Builder a inputs tipo `File`

Mitigacion:

- introducir `POST /api/compile/source`.

### Riesgo 4: perdida de trabajo visual

Mitigacion:

- persistir workspace en `localStorage`,
- añadir restauracion automatica al abrir Builder.

## Plan de implementacion recomendado

### Fase 1

- refactor del frontend en componentes,
- introduccion de `ContractSource`,
- nuevo selector de origen `Upload / Builder`,
- nuevo endpoint `POST /api/compile/source`.

### Fase 2

- empaquetar Builder dentro de `frontend/public/builder/`,
- crear `SmartContractBuilderFrame`,
- conectar `postMessage` para exportar Solidity y workspace.

### Fase 3

- persistencia local del workspace,
- ida y vuelta Playground <-> Builder,
- mensajes UX mas claros sobre validacion preliminar vs compilacion oficial.

### Fase 4

- soporte para importar un `.sol` existente dentro de Builder,
- galeria ampliada de plantillas,
- exportacion de artefactos o snippets ABI.

## Decision final

La mejor estrategia para esta arquitectura es:

- integrar SmartContract Builder como micro-frontend estatico embebido,
- comunicarlo con React mediante `postMessage`,
- unificar el origen del contrato en una estructura `ContractSource`,
- añadir `POST /api/compile/source` para pasar Solidity generado sin depender de subida de fichero,
- mantener compilacion y despliegue oficiales en la pipeline ya existente.

Es la opcion con mejor equilibrio entre tiempo de implementacion, aislamiento tecnico, mantenibilidad y encaje con el stack actual.