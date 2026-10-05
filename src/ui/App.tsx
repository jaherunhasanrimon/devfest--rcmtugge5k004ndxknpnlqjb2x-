import React, { useState } from 'react';
import { I18nProvider, useI18n } from '../i18n';
import { AppProvider, useApp } from '../state/store';
import { TopBar } from './TopBar';
import { MapView } from './MapView';
import { SidePanel } from './SidePanel';
import { Legend } from './Legend';
import { ImportModal } from './ImportModal';
import { validateBuilding } from '../core';
import sampleBuildingRaw from '../../public/sample/building.json';

const sampleResult = validateBuilding(sampleBuildingRaw);
const initialBuilding = sampleResult.valid ? sampleResult.building : null;

const AppContent: React.FC = () => {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const handleLoadSample = () => {
    if (sampleResult.valid) {
      dispatch({ type: 'LOAD_BUILDING', payload: sampleResult.building });
    }
  };

  return (
    <div className="app-layout">
      <TopBar onOpenImport={() => setIsImportOpen(true)} />

      <main className="main-content">
        {state.building ? (
          <>
            <MapView hoveredNodeId={hoveredNodeId} />
            <Legend />
            <SidePanel onHoverNode={setHoveredNodeId} />
          </>
        ) : (
          <div className="empty-screen">
            <div className="empty-card">
              <h2 className="empty-title">{t('import.title')}</h2>
              <p className="empty-subtitle">{t('import.subtitle')}</p>
              <div
                className="drop-zone"
                onClick={() => setIsImportOpen(true)}
                tabIndex={0}
                role="button"
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') setIsImportOpen(true);
                }}
              >
                <svg className="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="drop-text">{t('import.dropzone')}</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLoadSample}
              >
                {t('action.sample')}
              </button>
            </div>
          </div>
        )}
      </main>

      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AppProvider initialBuilding={initialBuilding}>
        <AppContent />
      </AppProvider>
    </I18nProvider>
  );
};
