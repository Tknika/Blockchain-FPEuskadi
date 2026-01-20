# Configuración Avanzada para el archivo config.js

# IMPORTANTE: Este archivo debe ser modificado ANTES de construir la imagen Docker
# Si ya construiste la imagen, necesitas reconstruirla después de modificar este archivo:
# docker-compose build --no-cache block-explorer
# docker-compose up -d

# Opción 1: Conexión a Besu en Docker Compose (Default)
export const BESU_CONFIG = {
  rpcUrl: 'http://besu-node:8545',  # Usa el nombre del servicio Docker
  chainId: 1337,
  networkName: 'Besu Red Educativa Docker',
  refreshInterval: 5000,
  blocksPerPage: 10,
  educationalMode: true
};

# Opción 2: Conexión a Besu en host local (fuera de Docker)
# Descomenta para usar Besu corriendo directamente en tu PC
/*
export const BESU_CONFIG = {
  rpcUrl: 'http://host.docker.internal:8545',  # Windows/Mac Docker Desktop
  // rpcUrl: 'http://172.17.0.1:8545',  # Linux Docker
  chainId: 1337,
  networkName: 'Besu Red Educativa Local',
  refreshInterval: 5000,
  blocksPerPage: 10,
  educationalMode: true
};
*/

# Opción 3: Conexión a Besu en servidor remoto
/*
export const BESU_CONFIG = {
  rpcUrl: 'http://192.168.1.100:8545',  # IP del servidor
  chainId: 1337,
  networkName: 'Besu Red Educativa Remota',
  refreshInterval: 10000,  # Aumenta el intervalo para redes remotas
  blocksPerPage: 15,
  educationalMode: true
};
*/

# Opción 4: Producción con HTTPS
/*
export const BESU_CONFIG = {
  rpcUrl: 'https://besu.tudominio.com',
  chainId: 2024,
  networkName: 'Red Besu Producción',
  refreshInterval: 15000,
  blocksPerPage: 20,
  educationalMode: false  # Desactiva tooltips educativos
};
*/
