import React, { useState, useEffect } from 'react';
import { X, Box, Clock, Hash, User, Zap, ArrowRight, BookOpen, HelpCircle, Copy, Check, Eye } from 'lucide-react';
import { besuService } from '../../services/besuService';
import { useLanguage } from '../../i18n/LanguageContext';
import DataDecoder from '../DataDecoder';
import './BlockDetail.css';

const BlockDetail = ({ block, onClose }) => {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(null);
  const [selectedTxData, setSelectedTxData] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (block && block.number !== undefined) {
        try {
          setLoading(true);
          const txs = await besuService.getBlockTransactions(block.number);
          setTransactions(txs);
        } catch (error) {
          console.error('Error cargando transacciones:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTransactions();
  }, [block]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('es-ES');
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 20)}...${hash.slice(-18)}`;
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const formatDataSummary = (data) => {
    if (!data || data === '0x') return t('noData');
    const bytes = (data.length - 2) / 2;
    return `${bytes} ${t('bytes')} - ${data.slice(0, 20)}...`;
  };

  if (!block) return null;

  return (
    <>
      {selectedTxData && (
        <DataDecoder 
          data={selectedTxData} 
          onClose={() => setSelectedTxData(null)} 
        />
      )}
      <div className="block-detail-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Box size={32} style={{ display: 'inline', marginRight: '12px' }} />
            {t('block')} #{block.number}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3 className="detail-section-title">
              <Hash size={20} />
              {t('blockDetails')}
            </h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">
                  <Hash size={14} />
                  {t('hash')}
                  <span className="tooltip-icon" title={t('hashTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value">{block.hash}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <Hash size={14} />
                  {t('parentHash')}
                  <span className="tooltip-icon" title={t('parentHashTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value">{block.parentHash}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <Clock size={14} />
                  {t('timestamp')}
                  <span className="tooltip-icon" title={t('timestampTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value">{formatTimestamp(block.timestamp)}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <User size={14} />
                  {t('miner')}
                  <span className="tooltip-icon" title={t('minerTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value">{block.miner}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <Box size={14} />
                  {t('difficulty')}
                  <span className="tooltip-icon" title={t('difficultyTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value large">
                  {parseInt(block.difficulty).toLocaleString()}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  <Zap size={14} />
                  {t('gasUsed')} / {t('gasLimit')}
                  <span className="tooltip-icon" title={t('gasUsedTooltip') + ' / ' + t('gasLimitTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value large">
                  {parseInt(block.gasUsed).toLocaleString()} / {parseInt(block.gasLimit).toLocaleString()}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  {t('nonce')}
                  <span className="tooltip-icon" title={t('nonceTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value">{block.nonce || 'N/A'}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">
                  {t('size')}
                  <span className="tooltip-icon" title={t('sizeTooltip')}>
                    <HelpCircle size={14} />
                  </span>
                </div>
                <div className="detail-value">{block.size || 'N/A'} {t('bytes')}</div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="detail-section-title">
              <ArrowRight size={20} />
              {t('transactions')} ({block.transactionCount})
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {t('loading')}...
              </div>
            ) : transactions.length > 0 ? (
              <div className="transaction-list">
                {transactions.map((tx, index) => (
                  <div key={tx.hash || index} className="transaction-item">
                    <div className="tx-header">
                      <div className="tx-hash-wrapper">
                        <span className="tx-label-inline">{t('hash')}:</span>
                        <div className="tx-hash tooltip" data-tooltip={tx.hash}>
                          {formatHash(tx.hash)}
                        </div>
                        <button 
                          className="copy-button"
                          onClick={() => copyToClipboard(tx.hash, tx.hash)}
                          title={copiedHash === tx.hash ? t('copied') : t('copy')}
                        >
                          {copiedHash === tx.hash ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <span className={`badge badge-${tx.status}`}>
                        {tx.status === 'success' ? t('connected') : tx.status === 'failed' ? t('disconnected') : t('checking')}
                      </span>
                    </div>
                    <div className="tx-details-vertical">
                      <div className="tx-detail-row">
                        <div className="tx-label">
                          <ArrowRight size={14} />
                          {t('from')}
                          <span className="tooltip-icon-small" title={t('fromTooltip')}>
                            <HelpCircle size={12} />
                          </span>
                        </div>
                        <div className="tx-value-full tooltip" data-tooltip={tx.from}>
                          {tx.from}
                        </div>
                      </div>
                      <div className="tx-detail-row">
                        <div className="tx-label">
                          <ArrowRight size={14} />
                          {t('to')}
                          <span className="tooltip-icon-small" title={t('toTooltip')}>
                            <HelpCircle size={12} />
                          </span>
                        </div>
                        <div className="tx-value-full tooltip" data-tooltip={tx.to || 'Contract Creation'}>
                          {tx.to || 'Contract Creation'}
                        </div>
                      </div>
                      <div className="tx-detail-row-inline">
                        <div className="tx-detail-inline">
                          <div className="tx-label">
                            <BookOpen size={14} />
                            {t('data')}
                            <span className="tooltip-icon-small" title={t('dataTooltip')}>
                              <HelpCircle size={12} />
                            </span>
                          </div>
                          <div className="tx-data-summary">
                            <span className="tx-value-full" style={{ fontSize: '0.85rem' }}>
                              {formatDataSummary(tx.data)}
                            </span>
                            {tx.data && tx.data !== '0x' && (
                              <button 
                                className="view-data-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTxData(tx.data);
                                }}
                                title={t('viewFullData')}
                              >
                                <Eye size={16} />
                                {t('viewData')}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="tx-detail-inline">
                          <div className="tx-label">
                            <Zap size={14} />
                            {t('gasUsed')}
                          </div>
                          <div className="tx-value">{tx.gasUsed ? parseInt(tx.gasUsed).toLocaleString() : 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-transactions">
                <p>{t('noTransactions')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default BlockDetail;
