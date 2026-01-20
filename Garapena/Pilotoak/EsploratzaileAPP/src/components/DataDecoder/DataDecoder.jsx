import React, { useState, useEffect } from 'react';
import { X, FileText, Code, Type } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './DataDecoder.css';

const DataDecoder = ({ data, onClose }) => {
  const { t } = useLanguage();
  const [decodedText, setDecodedText] = useState('');
  const [view, setView] = useState('ascii'); // 'ascii' o 'hex'

  useEffect(() => {
    if (data && data !== '0x') {
      // Decodificar datos hexadecimales a ASCII
      try {
        const hex = data.startsWith('0x') ? data.slice(2) : data;
        let decoded = '';
        
        for (let i = 0; i < hex.length; i += 2) {
          const byte = parseInt(hex.substr(i, 2), 16);
          // Solo mostrar caracteres imprimibles (32-126 en ASCII)
          if (byte >= 32 && byte <= 126) {
            decoded += String.fromCharCode(byte);
          } else if (byte === 10) { // Nueva línea
            decoded += '\n';
          } else if (byte === 13) { // Retorno de carro
            decoded += '\r';
          } else if (byte === 9) { // Tabulación
            decoded += '\t';
          } else {
            decoded += '.'; // Caracteres no imprimibles
          }
        }
        
        setDecodedText(decoded);
      } catch (error) {
        console.error('Error decodificando datos:', error);
        setDecodedText(t('errorDecoding'));
      }
    }
  }, [data, t]);

  if (!data || data === '0x') return null;

  // Formatear hex en líneas de 32 bytes (64 caracteres hex)
  const formatHex = (hexString) => {
    const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    const lines = [];
    for (let i = 0; i < hex.length; i += 64) {
      lines.push(hex.substr(i, 64));
    }
    return lines.join('\n');
  };

  return (
    <div className="data-decoder-modal" onClick={onClose}>
      <div className="decoder-content" onClick={(e) => e.stopPropagation()}>
        <div className="decoder-header">
          <h2 className="decoder-title">
            <FileText size={28} style={{ display: 'inline', marginRight: '12px' }} />
            {t('transactionData')}
          </h2>
          <button className="decoder-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="decoder-tabs">
          <button 
            className={`decoder-tab ${view === 'ascii' ? 'active' : ''}`}
            onClick={() => setView('ascii')}
          >
            <Type size={16} />
            {t('asciiView')}
          </button>
          <button 
            className={`decoder-tab ${view === 'hex' ? 'active' : ''}`}
            onClick={() => setView('hex')}
          >
            <Code size={16} />
            {t('hexView')}
          </button>
        </div>

        <div className="decoder-body">
          {view === 'ascii' ? (
            <div className="decoder-section">
              <div className="decoder-info">
                <FileText size={16} />
                {t('decodedText')}
              </div>
              <pre className="decoded-text">{decodedText || t('noReadableData')}</pre>
            </div>
          ) : (
            <div className="decoder-section">
              <div className="decoder-info">
                <Code size={16} />
                {t('hexadecimalData')}
              </div>
              <pre className="hex-data">{formatHex(data)}</pre>
            </div>
          )}
        </div>

        <div className="decoder-footer">
          <div className="data-stats">
            <span className="stat-item">
              <strong>{t('totalBytes')}:</strong> {(data.length - 2) / 2}
            </span>
            <span className="stat-item">
              <strong>{t('hexLength')}:</strong> {data.length} {t('characters')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDecoder;
