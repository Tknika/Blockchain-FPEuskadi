import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { besuService } from './services/besuService';
import Header from './components/Header/Header';
import SearchBar from './components/SearchBar/SearchBar';
import NetworkStats from './components/NetworkStats/NetworkStats';
import BlockList from './components/BlockList/BlockList';
import BlockDetail from './components/BlockDetail/BlockDetail';
import NodesMap from './components/NodesMap';
import { BESU_CONFIG, BESU_NODES } from '../config.js';
import './styles/global.css';

// Componente principal del explorador
function BlockExplorer({ 
  theme, 
  toggleTheme, 
  isConnected, 
  currentNode, 
  handleNodeChange,
  loading,
  blocks,
  stats,
  selectedBlock,
  setSelectedBlock,
  handleSearch,
  searchLoading,
  searchResult,
  handleBlockClick,
  handleLoadMore
}) {
  return (
    <>
      <Header 
        isConnected={isConnected} 
        theme={theme}
        toggleTheme={toggleTheme}
        currentNode={currentNode}
        onNodeChange={handleNodeChange}
      />

      <main className="container" style={{ paddingTop: '20px', paddingBottom: '60px' }}>
        {!isConnected && !loading && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid var(--primary-red)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            margin: '20px 0',
            color: 'var(--primary-red)'
          }}>
            <h3>⚠️ No conectado al nodo Besu</h3>
            <p>Verifica que tu nodo Hyperledger Besu esté corriendo en: <code>{BESU_CONFIG.rpcUrl}</code></p>
            <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Puedes cambiar la URL en el archivo <code>config.js</code>
            </p>
          </div>
        )}

        <SearchBar onSearch={handleSearch} loading={searchLoading} />

        {searchResult && searchResult.type === 'not_found' && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--primary-orange)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            color: 'var(--primary-orange)',
            marginBottom: '20px'
          }}>
            No se encontraron resultados para la búsqueda
          </div>
        )}

        {searchResult && searchResult.type === 'address' && (
          <div className="card" style={{ marginBottom: '20px', animationDelay: '0s' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary-blue)' }}>
              📍 Información de Dirección
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Dirección
                </div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {searchResult.data.address}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Balance
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-green)' }}>
                  {parseFloat(searchResult.data.balance.ether).toFixed(6)} ETH
                </div>
              </div>
            </div>
          </div>
        )}

        {searchResult && searchResult.type === 'transaction' && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary-blue)' }}>
              🔄 Detalles de Transacción
            </h3>
            <div style={{ display: 'grid', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <strong>Hash:</strong> <code>{searchResult.data.hash}</code>
              </div>
              <div>
                <strong>Estado:</strong> <span className={`badge badge-${searchResult.data.status}`}>
                  {searchResult.data.status}
                </span>
              </div>
              <div>
                <strong>De:</strong> <code>{searchResult.data.from}</code>
              </div>
              <div>
                <strong>A:</strong> <code>{searchResult.data.to || 'Creación de contrato'}</code>
              </div>
              <div>
                <strong>Valor:</strong> {searchResult.data.value} ETH
              </div>
              <div>
                <strong>Bloque:</strong> #{searchResult.data.blockNumber}
              </div>
            </div>
          </div>
        )}

        {isConnected && (
          <>
            <NetworkStats stats={stats} loading={loading && !stats} />
            <BlockList 
              blocks={blocks}
              loading={loading}
              onBlockClick={handleBlockClick}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </main>

      {selectedBlock && (
        <BlockDetail 
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </>
  );
}

function App() {
  const [theme, setTheme] = useState('dark');
  const [isConnected, setIsConnected] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState(
    localStorage.getItem('selectedNodeId') || BESU_CONFIG.defaultNodeId
  );

  // Conectar al nodo Besu al cargar
  useEffect(() => {
    const connectToBesu = async () => {
      const connected = await besuService.connect();
      setIsConnected(connected);
      if (connected) {
        await fetchInitialData();
      }
      setLoading(false);
    };

    connectToBesu();
  }, []);

  // Actualizar datos periódicamente
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      fetchStats();
      fetchBlocks(false);
    }, BESU_CONFIG.refreshInterval);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Cambiar tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchBlocks()
      ]);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const networkStats = await besuService.getNetworkStats();
      setStats(networkStats);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    }
  };

  const fetchBlocks = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const recentBlocks = await besuService.getBlocks(BESU_CONFIG.blocksPerPage);
      setBlocks(recentBlocks);
    } catch (error) {
      console.error('Error obteniendo bloques:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const result = await besuService.search(query);
      setSearchResult(result);

      if (result.type === 'block') {
        setSelectedBlock(result.data);
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchResult({ type: 'error', data: 'Error realizando búsqueda' });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBlockClick = (block) => {
    setSelectedBlock(block);
  };

  const handleLoadMore = async () => {
    try {
      setLoading(true);
      const moreBlocks = await besuService.getBlocks(blocks.length + BESU_CONFIG.blocksPerPage);
      setBlocks(moreBlocks);
    } catch (error) {
      console.error('Error cargando más bloques:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de nodo
  const handleNodeChange = async (node) => {
    console.log('Cambiando a nodo:', node.name);
    setLoading(true);
    setIsConnected(false);
    setBlocks([]);
    setStats(null);
    setCurrentNode(node.id);

    try {
      const connected = await besuService.switchNode(node.id);
      setIsConnected(connected);
      
      if (connected) {
        await fetchInitialData();
      }
    } catch (error) {
      console.error('Error cambiando de nodo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={
            <BlockExplorer
              theme={theme}
              toggleTheme={toggleTheme}
              isConnected={isConnected}
              currentNode={currentNode}
              handleNodeChange={handleNodeChange}
              loading={loading}
              blocks={blocks}
              stats={stats}
              selectedBlock={selectedBlock}
              setSelectedBlock={setSelectedBlock}
              handleSearch={handleSearch}
              searchLoading={searchLoading}
              searchResult={searchResult}
              handleBlockClick={handleBlockClick}
              handleLoadMore={handleLoadMore}
            />
          } />
          <Route path="/mapa-nodos" element={
            <>
              <Header 
                isConnected={isConnected} 
                theme={theme}
                toggleTheme={toggleTheme}
                currentNode={currentNode}
                onNodeChange={handleNodeChange}
              />
              <NodesMap />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
