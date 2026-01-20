# Explorador de Bloques - Hyperledger Besu

Explorador web para redes blockchain Hyperledger Besu con soporte multi-nodo e internacionalización (ES/EU/EN).

## Características

- Visualización en tiempo real de bloques y transacciones
- Selector de 8 nodos RPC con monitoreo de estado
- Búsqueda por bloque, hash de transacción o dirección
- Estadísticas de red (TPS, tiempo de bloque, gas)
- Internacionalización: Español, Euskera, Inglés
- Temas claro/oscuro
- Diseño responsive

## Instalación con Docker

```powershell
docker-compose up -d
```

Abrir http://localhost

## Desarrollo Local

```powershell
npm install
npm run dev
```

## Configuración

Editar `config.js` para configurar los nodos RPC:

```javascript
export const BESU_NODES = [
  {
    id: 'node1',
    name: 'Nodo 1',
    rpcUrl: 'http://217.127.110.210:8545',
    location: 'España'
  },
  // ... más nodos
];
```

## Tecnologías

- React 18 + Vite
- Ethers.js 6
- Docker + Nginx
- CSS3 con variables personalizadas

## Comandos Docker

```powershell
# Iniciar
docker-compose up -d

# Detener
docker-compose down

# Ver logs
docker-compose logs -f

# Reconstruir
docker-compose up -d --build
```

## Estructura

```
src/
├── components/     # Componentes React
├── i18n/          # Traducciones
├── services/      # Servicio Besu
└── styles/        # Estilos globales
```

## Licencia

MIT
