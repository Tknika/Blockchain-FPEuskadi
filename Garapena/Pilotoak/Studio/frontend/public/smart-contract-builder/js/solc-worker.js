'use strict';

let compilerReady = false;
let solcBridge = null;
const compilerLogs = [];

function pushLog(message) {
  compilerLogs.push(String(message));
  if (compilerLogs.length > 20) {
    compilerLogs.shift();
  }
}

function bindSolcMethod(soljson, methodName, returnType, argTypes) {
  if (!soljson || typeof soljson.cwrap !== 'function') {
    return null;
  }

  try {
    return soljson.cwrap(methodName, returnType, argTypes);
  } catch {
    return null;
  }
}

function createSolcBridge(soljson) {
  const compileStandard = bindSolcMethod(soljson, 'solidity_compile', 'string', ['string', 'number', 'number']);
  if (!compileStandard) {
    throw new Error('No se pudo enlazar solidity_compile en el worker.');
  }

  const alloc = bindSolcMethod(soljson, 'solidity_alloc', 'number', ['number']) || soljson._malloc;
  const reset = bindSolcMethod(soljson, 'solidity_reset', null, []);
  const copyFromCString = soljson.UTF8ToString || soljson.Pointer_stringify;
  const addFunction = soljson.addFunction || (soljson.Runtime && soljson.Runtime.addFunction);
  const removeFunction = soljson.removeFunction || (soljson.Runtime && soljson.Runtime.removeFunction);

  if (typeof alloc !== 'function' || typeof copyFromCString !== 'function') {
    throw new Error('El worker no pudo inicializar las utilidades de memoria de solc.');
  }

  if (typeof addFunction !== 'function' || typeof removeFunction !== 'function') {
    throw new Error('El runtime del compilador no soporta callbacks dentro del worker.');
  }

  return {
    compile(input, callbacks = {}) {
      const importCallback = callbacks.import || (() => ({ error: 'File import callback not supported' }));

      const writeCString = (text, pointerLocation) => {
        const length = soljson.lengthBytesUTF8(text);
        const buffer = alloc(length + 1);
        soljson.stringToUTF8(text, buffer, length + 1);
        soljson.setValue(pointerLocation, buffer, '*');
      };

      const wrappedCallback = (context, kindPtr, dataPtr, contentsPtr, errorPtr) => {
        if (context !== 0) {
          return;
        }

        const kind = copyFromCString(kindPtr);
        const data = copyFromCString(dataPtr);
        const result = kind === 'source'
          ? importCallback(data)
          : { error: `Unsupported callback kind: ${kind}` };

        if (result && typeof result.contents === 'string') {
          writeCString(result.contents, contentsPtr);
        }

        if (result && typeof result.error === 'string') {
          writeCString(result.error, errorPtr);
        }
      };

      const callbackPtr = addFunction(wrappedCallback, 'viiiii');

      try {
        return compileStandard(input, callbackPtr, 0);
      } finally {
        removeFunction(callbackPtr);
        if (typeof reset === 'function') {
          reset();
        }
      }
    }
  };
}

function postWorkerMessage(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

self.Module = {
  print(message) {
    pushLog(message);
  },
  printErr(message) {
    pushLog(message);
  },
  onAbort(reason) {
    postWorkerMessage('error', {
      error: String(reason || 'El runtime del compilador abortó dentro del worker.'),
      logs: compilerLogs.slice(),
    });
  },
  onRuntimeInitialized() {
    try {
      solcBridge = createSolcBridge(self.Module);
      compilerReady = true;
      postWorkerMessage('ready');
    } catch (error) {
      postWorkerMessage('error', {
        error: error instanceof Error ? error.message : 'No se pudo inicializar solc en el worker.',
        logs: compilerLogs.slice(),
      });
    }
  },
};

var Module = self.Module;

try {
  importScripts('./vendor/soljson-v0.8.20+commit.a1b79de6.js');
} catch (error) {
  postWorkerMessage('error', {
    error: error instanceof Error ? error.message : 'No se pudo cargar soljson en el worker.',
    logs: compilerLogs.slice(),
  });
}

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type !== 'compile') {
    return;
  }

  if (!compilerReady || !solcBridge) {
    postWorkerMessage('compile-error', {
      requestId: data.requestId,
      error: 'El compilador todavía no está listo en el worker.',
      logs: compilerLogs.slice(),
    });
    return;
  }

  try {
    const output = solcBridge.compile(data.input, {
      import: (path) => ({ error: `Import no resuelto: ${path}` }),
    });

    postWorkerMessage('compile-result', {
      requestId: data.requestId,
      output,
    });
  } catch (error) {
    postWorkerMessage('compile-error', {
      requestId: data.requestId,
      error: error instanceof Error ? error.message : 'Falló la compilación dentro del worker.',
      logs: compilerLogs.slice(),
    });
  }
});