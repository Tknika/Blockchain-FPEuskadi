import React from 'react';
import { Box, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './BlockList.css';

const BlockList = ({ blocks, loading, onBlockClick, onLoadMore }) => {
  const { t } = useLanguage();
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);
    
    if (diffSeconds < 60) return `hace ${diffSeconds}s`;
    if (diffSeconds < 3600) return `hace ${Math.floor(diffSeconds / 60)}m`;
    if (diffSeconds < 86400) return `hace ${Math.floor(diffSeconds / 3600)}h`;
    return date.toLocaleDateString('es-ES');
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const calculateGasUsage = (gasUsed, gasLimit) => {
    if (!gasUsed || !gasLimit) return 0;
    return (parseInt(gasUsed) / parseInt(gasLimit)) * 100;
  };

  if (loading && blocks.length === 0) {
    return (
      <div className="loading-spinner">
        <Loader size={40} className="animate-spin" />
        <p style={{ marginTop: '16px' }}>{t('loadingBlocks')}</p>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="no-blocks">
        <AlertCircle size={48} className="no-blocks-icon" />
        <h3>{t('noBlocks')}</h3>
        <p>{t('errorConnecting')}</p>
      </div>
    );
  }

  return (
    <div className="block-list">
      <h2 className="section-title">
        <Box size={28} />
        {t('recentBlocks')}
      </h2>

      <div className="block-grid">
        {blocks.map((block, index) => (
          <div 
            key={block.hash || index}
            className="block-card"
            onClick={() => onBlockClick && onBlockClick(block)}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="block-header">
              <div>
                <div className="block-number">{t('block')} #{block.number}</div>
                <div className="block-time">{formatTimestamp(block.timestamp)}</div>
              </div>
            </div>

            <div className="block-info">
              <div className="block-info-item">
                <div className="block-info-label">{t('hash')}</div>
                <div className="block-info-value block-hash tooltip" data-tooltip={block.hash}>
                  {formatHash(block.hash)}
                </div>
              </div>

              <div className="block-info-item">
                <div className="block-info-label">{t('miner')}</div>
                <div className="block-info-value block-hash tooltip" data-tooltip={block.miner}>
                  {formatHash(block.miner)}
                </div>
              </div>

              <div className="block-info-item">
                <div className="block-info-label">{t('parentHash')}</div>
                <div className="block-info-value block-hash tooltip" data-tooltip={block.parentHash}>
                  {formatHash(block.parentHash)}
                </div>
              </div>

              <div className="block-info-item">
                <div className="block-info-label">{t('difficulty')}</div>
                <div className="block-info-value">
                  {parseInt(block.difficulty).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="block-footer">
              <div className="tx-count">
                <ArrowRight size={16} />
                <span>{block.transactionCount} {t('transactions')}</span>
              </div>

              <div className="gas-usage">
                <div className="gas-bar">
                  <div 
                    className="gas-bar-fill"
                    style={{ width: `${calculateGasUsage(block.gasUsed, block.gasLimit)}%` }}
                  />
                </div>
                <div className="gas-text">
                  {parseInt(block.gasUsed).toLocaleString()} / {parseInt(block.gasLimit).toLocaleString()} Gas
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {onLoadMore && (
        <button 
          className="load-more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader size={16} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
              {t('loading')}
            </>
          ) : (
            t('loadingBlocks')
          )}
        </button>
      )}
    </div>
  );
};

export default BlockList;
