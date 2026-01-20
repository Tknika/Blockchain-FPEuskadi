// Configuración para conexión a Hyperledger Besu
// IMPORTANTE: El usuario puede elegir el nodo desde la interfaz

// Detectar si estamos en desarrollo (localhost o desarrollo local)
// En producción, usar las URLs del dominio de producción
const isDevelopment = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'esploratzaile.localhost' ||
  window.location.hostname.startsWith('192.168.')
);

// Configuración de nodos para desarrollo (4 nodos con IPs directas)
const DEVELOPMENT_NODES = [
  {
    id: 'node1',
    name: 'Nodo 192.168.100.1',
    rpcUrl: 'http://192.168.100.1:8545',
    location: 'Galdakao',
    coordinates: { lat: 43.2324, lng: -2.8447 }
  },
  {
    id: 'node2',
    name: 'Nodo 192.168.100.2',
    rpcUrl: 'http://192.168.100.2:8545',
    location: 'Santurtzi',
    coordinates: { lat: 43.3293, lng: -3.0326 }
  },
  {
    id: 'node3',
    name: 'Nodo 192.168.100.3',
    rpcUrl: 'http://192.168.100.3:8545',
    location: 'Vitoria-Gasteiz',
    coordinates: { lat: 42.8467, lng: -2.6716 }
  },
  {
    id: 'node4',
    name: 'Nodo 192.168.100.4',
    rpcUrl: 'http://192.168.100.4:8545',
    location: 'Amorebieta-Etxano',
    coordinates: { lat: 43.2203, lng: -2.7321 }
  }
];

// Configuración de nodos para producción (10 nodos con URLs del dominio)
const PRODUCTION_NODES = [
  {
    id: 'node1',
    name: 'CIFP Andra Mari LHII',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node1',
    location: 'Galdakao',
    coordinates: { lat: 43.2324, lng: -2.8447 }
  },
  {
    id: 'node2',
    name: 'CPIFP Calasanz LHIPI',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node2',
    location: 'Santurtzi',
    coordinates: { lat: 43.3293, lng: -3.0326 }
  },
  {
    id: 'node3',
    name: 'CIFP Ciudad Jardín LHII',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node3',
    location: 'Vitoria-Gasteiz',
    coordinates: { lat: 42.8467, lng: -2.6716 }
  },
  {
    id: 'node4',
    name: 'CIFP Zornotza LHII',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node4',
    location: 'Amorebieta-Etxano',
    coordinates: { lat: 43.2203, lng: -2.7321 }
  },
  {
    id: 'node5',
    name: 'Tknika 1',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node5',
    location: 'Errenteria',
    coordinates: { lat: 43.3103, lng: -1.9012 }
  },
  {
    id: 'node6',
    name: 'Tknika 2',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node6',
    location: 'Derio',
    coordinates: { lat: 43.2999, lng: -2.8709 }
  },
  {
    id: 'node7',
    name: 'CIFP Emilio Campuzano LHII',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node7',
    location: 'Barakaldo',
    coordinates: { lat: 43.2983, lng: -2.9886 }
  },
  {
    id: 'node8',
    name: 'CIFP Txurdinaga LHII',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node8',
    location: 'Bilbao',
    coordinates: { lat: 43.2565, lng: -2.9501 }
  },
  {
    id: 'node9',
    name: 'CIFP Armeria Eskola LHII',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node9',
    location: 'Eibar',
    coordinates: { lat: 43.1836, lng: -2.4807 }
  },
  {
    id: 'node10',
    name: 'CIFP Bidasoa LHII',
    rpcUrl: 'https://esploratzaile.blockchain.tkn.eus/api/node10',
    location: 'Irun',
    coordinates: { lat: 43.3364, lng: -1.7865 }
  }
];

// Seleccionar la configuración según el entorno
// Lista de nodos RPC disponibles en la red
// URLs absolutas para compatibilidad con ethers.js
export const BESU_NODES = isDevelopment ? DEVELOPMENT_NODES : PRODUCTION_NODES;

export const BESU_CONFIG = {
  // Nodo por defecto (se usa si no hay selección guardada)
  defaultNodeId: 'node1',
  
  // Chain ID de tu red
  chainId: 1337,
  
  // Nombre de tu red
  networkName: 'BFPE - Blockchain FP Euskadi',
  
  // Intervalo de actualización (milisegundos)
  refreshInterval: 5000,
  
  // Bloques por página
  blocksPerPage: 10,
  
  // Modo educativo (tooltips y explicaciones)
  educationalMode: true
};
