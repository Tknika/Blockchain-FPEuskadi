import React, { useState } from 'react';
import { Search, Loader } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './SearchBar.css';

const SearchBar = ({ onSearch, loading }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleExampleClick = (example) => {
    setQuery(example);
    onSearch(example);
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-container">
        <div className="search-input-wrapper">
          {loading ? (
            <Loader className="search-icon animate-spin" size={20} />
          ) : (
            <Search className="search-icon" size={20} />
          )}
          <input
            type="text"
            className="search-input"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={loading}
          >
            {loading ? t('searching') : t('search')}
          </button>
        </div>

        <div className="search-examples">
          <span>Ejemplos: </span>
          <span 
            className="search-example"
            onClick={() => handleExampleClick('0')}
          >
            Bloque 0
          </span>
          <span 
            className="search-example"
            onClick={() => handleExampleClick('1')}
          >
            Bloque 1
          </span>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
