import React, { useRef } from 'react';
import { useApp } from '../state/store';
import { useI18n } from '../i18n';
import { validateBuilding } from '../core';
import sampleBuildingRaw from '../../public/sample/building.json';

interface TopBarProps {
  onOpenImport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenImport }) => {
  const { state, dispatch } = useApp();
  const { lang, setLang, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadSample = () => {
    const result = validateBuilding(sampleBuildingRaw);
    if (result.valid) {
      dispatch({ type: 'LOAD_BUILDING', payload: result.building });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const result = validateBuilding(content);
        if (result.valid) {
          dispatch({ type: 'LOAD_BUILDING', payload: result.building });
        } else {
          dispatch({ type: 'SET_VALIDATION_ISSUES', payload: result.issues });
          onOpenImport();
        }
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be reloaded if desired
    e.target.value = '';
  };

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="brand">
          <span className="brand-badge">SE</span>
          <span className="brand-title">Smart Escape</span>
        </div>
        {state.building && (
          <div className="building-badge" title={state.building.name}>
            <span className="building-dot"></span>
            <span className="building-name">{state.building.name}</span>
          </div>
        )}
      </div>

      <div className="top-bar-right">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          style={{ display: 'none' }}
          id="topbar-file-input"
        />

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onOpenImport}
          title={t('action.import')}
        >
          <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          {t('action.import')}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleLoadSample}
          title={t('action.sample')}
        >
          <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
          {t('action.sample')}
        </button>

        <div className="lang-toggle-group" data-testid="lang-toggle">
          <button
            type="button"
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
            onClick={() => setLang('bn')}
            aria-pressed={lang === 'bn'}
          >
            বাংলা
          </button>
        </div>
      </div>
    </header>
  );
};
