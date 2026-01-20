import React, { useState, useEffect, useRef } from 'react';
import { Server, ChevronDown, Check, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { BESU_NODES } from '../../../config.js';
import { useLanguage } from '../../i18n/LanguageContext';
import './NodeSelector.css';

const NodeSelector = ({ currentNode, onNodeChange, isConnected }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [currentNodeStatus, setCurrentNodeStatus] = useState('checking');
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Verificar estado del nodo actual constantemente
  useEffect(() => {
    const checkCurrentNode = async () => {
      const node = BESU_NODES.find(n => n.id === currentNode);
      if (!node) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
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
        setCurrentNodeStatus(response.ok ? 'connected' : 'disconnected');
      } catch (error) {
        setCurrentNodeStatus('disconnected');
      }
    };

    // Verificar inmediatamente
    checkCurrentNode();
    
    // Verificar cada 10 segundos
    const interval = setInterval(checkCurrentNode, 10000);
    
    return () => clearInterval(interval);
  }, [currentNode]);

  // Verificar estado de todos los nodos cuando se abre el dropdown
  useEffect(() => {
    if (isOpen) {
      checkNodeStatuses();
    }
  }, [isOpen]);

  const checkNodeStatuses = async () => {
    const statuses = {};
    
    for (const node of BESU_NODES) {
      statuses[node.id] = 'checking';
      setNodeStatuses({ ...statuses });
      
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
        statuses[node.id] = response.ok ? 'connected' : 'disconnected';
      } catch (error) {
        statuses[node.id] = 'disconnected';
      }
      
      setNodeStatuses({ ...statuses });
    }
  };

  const handleNodeSelect = (node) => {
    onNodeChange(node);
    setIsOpen(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'connected';
      case 'disconnected': return 'disconnected';
      case 'checking': return 'checking';
      default: return 'disconnected';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': 
        return <CheckCircle size={20} className="status-icon connected" />;
      case 'disconnected': 
        return <XCircle size={20} className="status-icon disconnected" />;
      case 'checking': 
        return <RefreshCw size={20} className="status-icon checking" />;
      default: 
        return <XCircle size={20} className="status-icon disconnected" />;
    }
  };

  const currentNodeData = BESU_NODES.find(node => node.id === currentNode);

  return (
    <div className="node-selector" ref={dropdownRef}>
      <button
        className={`node-selector-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t('selectNode')}
      >
        <Server size={20} className="node-selector-icon" />
        
        <div className="node-selector-content">
          <div className="node-selector-label">{t('nodeRPC')}</div>
          <div className="node-selector-value">
            <span
              className={`node-status-indicator ${getStatusColor(currentNodeStatus)}`}
              title={currentNodeStatus === 'connected' ? t('connected') : currentNodeStatus === 'checking' ? t('checking') : t('disconnected')}
            />
            {currentNodeData?.name || t('selectNode')}
          </div>
        </div>
        
        <ChevronDown size={18} className="node-selector-arrow" />
      </button>

      {isOpen && (
        <div className="node-selector-dropdown">
          <div className="node-dropdown-header">
            <div className="node-dropdown-title">
              <Server size={16} />
              {t('availableNodes')}
            </div>
            <div className="node-dropdown-subtitle">
              {t('selectNodeMessage')}
            </div>
          </div>

          {BESU_NODES.map((node) => {
            const isSelected = node.id === currentNode;
            const status = nodeStatuses[node.id] || 'disconnected';

            return (
              <div
                key={node.id}
                className={`node-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleNodeSelect(node)}
              >
                <div className="node-option-status">
                  {getStatusIcon(status)}
                </div>
                
                <div className="node-option-info">
                  <div className="node-option-name">{node.name}</div>
                </div>

                {isSelected && (
                  <Check size={20} className="node-option-check" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NodeSelector;
