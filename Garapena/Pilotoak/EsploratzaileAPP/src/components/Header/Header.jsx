import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Moon, Sun } from 'lucide-react';
import NodeSelector from '../NodeSelector/NodeSelector';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import { useLanguage } from '../../i18n/LanguageContext';
import './Header.css';

const Header = ({ isConnected, theme, toggleTheme, currentNode, onNodeChange }) => {
  const { t } = useLanguage();
  const location = useLocation();
  
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-logo">
          <img 
            src="/BFPE-logo.png" 
            alt="BFPE Logo" 
            className="header-logo-img"
          />
        </div>

        <div className="header-center">
          <h1 className="header-title">{t('appTitle')}</h1>
          
          <nav className="header-nav">
            <Link
              to="/"
              className={`header-nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              {t('navBlockExplorer')}
            </Link>
            <Link
              to="/mapa-nodos"
              className={`header-nav-link ${location.pathname === '/mapa-nodos' ? 'active' : ''}`}
            >
              {t('navNodesMap')}
            </Link>
          </nav>
        </div>

        <div className="header-actions">
          {/* Selector de Nodos */}
          <NodeSelector
            currentNode={currentNode}
            onNodeChange={onNodeChange}
            isConnected={isConnected}
          />

          {/* Selector de Idioma */}
          <LanguageSelector />

          {/* Toggle de Tema */}
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            aria-label={t('darkTheme')}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
