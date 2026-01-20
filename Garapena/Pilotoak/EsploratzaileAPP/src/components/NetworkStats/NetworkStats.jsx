import React from 'react';
import { Blocks, Activity, Zap, Clock, BookOpen } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './NetworkStats.css';

const NetworkStats = ({ stats, loading }) => {
  const { t } = useLanguage();
  if (loading && !stats) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card">
            <div className="stat-icon blue">
              <Blocks size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-label">{t('loading')}</div>
              <div className="stat-value loading">---</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card tooltip" data-tooltip={t('latestBlockTooltip')}>
          <div className="stat-icon blue">
            <Blocks size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">{t('latestBlock')}</div>
            <div className="stat-value">
              {stats?.latestBlock?.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        <div className="stat-card tooltip" data-tooltip={t('tpsTooltip')}>
          <div className="stat-icon green">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">{t('tpsLabel')}</div>
            <div className="stat-value">
              {stats?.tps || '0'}
            </div>
            <div className="stat-subtitle">{t('tpsSubtitle')}</div>
          </div>
        </div>

        <div className="stat-card tooltip" data-tooltip={t('blockTimeTooltip')}>
          <div className="stat-icon purple">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">{t('blockTimeLabel')}</div>
            <div className="stat-value">
              {stats?.averageBlockTime?.toFixed(1) || '0'}s
            </div>
            <div className="stat-subtitle">{t('blockTimeSubtitle')}</div>
          </div>
        </div>

        <div className="stat-card tooltip" data-tooltip={t('gasLimitTooltip')}>
          <div className="stat-icon orange">
            <Zap size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">{t('gasLimitLabel')}</div>
            <div className="stat-value">
              {stats?.gasLimit ? (parseInt(stats.gasLimit) / 1000000).toFixed(1) + 'M' : '0M'}
            </div>
            <div className="stat-subtitle">{t('gasLimitSubtitle')}</div>
          </div>
        </div>
      </div>

      <div className="educational-note">
        <div className="educational-note-title">
          <BookOpen size={18} />
          {t('educationalNoteTitle')}
        </div>
        <div className="educational-note-content">
          {t('educationalNoteContent')}
        </div>
      </div>
    </>
  );
};

export default NetworkStats;
