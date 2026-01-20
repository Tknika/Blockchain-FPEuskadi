// Configuración para conexión a Hyperledger Besu
// Copia este archivo como config.js y ajusta los valores según tu red

export const BESU_CONFIG = {
  // URL del nodo RPC de Hyperledger Besu
  rpcUrl: 'http://localhost:8545',
  
  // Chain ID de tu red (1337 para desarrollo local)
  chainId: 1337,
  
  // Nombre de la red
  networkName: 'Besu Red Educativa',
  
  // Intervalo de actualización en milisegundos
  refreshInterval: 5000,
  
  // Número de bloques a mostrar por página
  blocksPerPage: 10,
  
  // Habilitar modo educativo (tooltips y explicaciones)
  educationalMode: true
};
