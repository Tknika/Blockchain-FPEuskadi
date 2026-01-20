import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BESU_NODES } from '../../../config';
import { useLanguage } from '../../i18n/LanguageContext';
import './NodesMap.css';

// Iconos personalizados para nodos online/offline
const createNodeIcon = (isOnline) => {
  return L.divIcon({
    className: 'custom-node-icon',
    html: `
      <div class="node-marker ${isOnline ? 'online' : 'offline'}">
        <div class="node-marker-inner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            ${isOnline 
              ? '<circle cx="12" cy="12" r="8"/>' 
              : '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>'}
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

export default function NodesMap() {
  const { t } = useLanguage();
  const [nodeStatus, setNodeStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para verificar el estado de un nodo usando fetch (mismo método que NodeSelector)
  const checkNodeStatus = async (node) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(node.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const blockNumber = data.result ? parseInt(data.result, 16) : null;
        return { 
          id: node.id, 
          online: true,
          blockNumber: blockNumber
        };
      } else {
        return { 
          id: node.id, 
          online: false,
          blockNumber: null
        };
      }
    } catch (error) {
      console.error(`Error checking ${node.id}:`, error.message);
      return { 
        id: node.id, 
        online: false,
        blockNumber: null
      };
    }
  };

  // Verificar estado de todos los nodos
  const checkAllNodes = async () => {
    setLoading(true);
    const statusPromises = BESU_NODES.map(node => checkNodeStatus(node));
    const results = await Promise.all(statusPromises);
    
    const statusMap = results.reduce((acc, result) => {
      acc[result.id] = {
        online: result.online,
        blockNumber: result.blockNumber
      };
      return acc;
    }, {});
    
    setNodeStatus(statusMap);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    checkAllNodes();
    // Actualizar cada 30 segundos
    const interval = setInterval(checkAllNodes, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calcular estadísticas
  const onlineNodes = Object.values(nodeStatus).filter(s => s.online).length;
  const offlineNodes = Object.values(nodeStatus).filter(s => !s.online).length;

  // Centro del mapa (aproximadamente centro del País Vasco)
  const mapCenter = [43.05, -2.65];

  return (
    <div className="nodes-map-container">
      <div className="map-header">
        <h1>{t('nodesMapTitle')}</h1>
        <p>{t('nodesMapSubtitle')}</p>
      </div>

      <div className="map-stats">
        <div className="stat-item online">
          <div className="stat-indicator"></div>
          <span className="stat-label">{t('nodesOnline')}:</span>
          <span className="stat-value">{onlineNodes}</span>
        </div>
        <div className="stat-item offline">
          <div className="stat-indicator"></div>
          <span className="stat-label">{t('nodesOffline')}:</span>
          <span className="stat-value">{offlineNodes}</span>
        </div>
        <div className="stat-item total">
          <span className="stat-label">{t('total')}:</span>
          <span className="stat-value">{BESU_NODES.length}</span>
        </div>
        <div className="last-update">
          {loading ? (
            <span>{t('updating')}</span>
          ) : lastUpdate ? (
            <span>{t('lastUpdate')}: {lastUpdate.toLocaleTimeString('es-ES')}</span>
          ) : null}
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={9}
          style={{ height: '100%', width: '100%', minHeight: '400px' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {BESU_NODES.map((node) => {
            if (!node.coordinates) return null;
            
            const status = nodeStatus[node.id] || { online: false, blockNumber: null };
            
            return (
              <Marker
                key={node.id}
                position={[node.coordinates.lat, node.coordinates.lng]}
                icon={createNodeIcon(status.online)}
              >
                <Popup>
                  <div className="node-popup">
                    <h3>{node.name}</h3>
                    <div className="popup-row">
                      <strong>{t('location')}:</strong>
                      <span>{node.location}</span>
                    </div>
                    <div className="popup-row">
                      <strong>{t('status')}:</strong>
                      <span className={status.online ? 'status-online' : 'status-offline'}>
                        {status.online ? `● ${t('online')}` : `● ${t('offline')}`}
                      </span>
                    </div>
                    {status.online && status.blockNumber !== null && (
                      <div className="popup-row">
                        <strong>{t('lastBlock')}:</strong>
                        <span>#{status.blockNumber}</span>
                      </div>
                    )}
                    <div className="popup-row">
                      <strong>{t('nodeId')}:</strong>
                      <span className="node-id">{node.id}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
