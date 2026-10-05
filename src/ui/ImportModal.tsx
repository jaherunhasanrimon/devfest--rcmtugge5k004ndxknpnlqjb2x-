import React, { useState, useRef, DragEvent } from 'react';
import { useApp } from '../state/store';
import { useI18n, TranslationKey } from '../i18n';
import { validateBuilding } from '../core';
import sampleBuildingRaw from '../../public/sample/building.json';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessContent = (content: string) => {
    const result = validateBuilding(content);
    if (result.valid) {
      dispatch({ type: 'LOAD_BUILDING', payload: result.building });
      onClose();
    } else {
      dispatch({ type: 'SET_VALIDATION_ISSUES', payload: result.issues });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        handleProcessContent(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        handleProcessContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    const result = validateBuilding(sampleBuildingRaw);
    if (result.valid) {
      dispatch({ type: 'LOAD_BUILDING', payload: result.building });
      onClose();
    }
  };

  const issues = state.validationIssues;
  const maxIssues = 8;
  const displayedIssues = issues.slice(0, maxIssues);
  const remainingIssuesCount = issues.length - maxIssues;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{t('import.title')}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('action.closeMenu')}
          >
            ✕
          </button>
        </div>

        <p className="modal-description">{t('import.subtitle')}</p>

        {/* Localized Validation Issues Display */}
        {issues.length > 0 && (
          <div className="validation-error-panel" role="alert">
            <div className="error-panel-header">
              <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <strong>{t('import.invalidTitle')}</strong>
            </div>

            <ul className="error-list">
              {displayedIssues.map((issue, idx) => {
                const errorKey = `error.${issue.code}` as TranslationKey;
                const message = t(errorKey, issue.params);
                return (
                  <li key={idx} className="error-item">
                    {issue.path && <span className="error-path">[{issue.path}] </span>}
                    {message}
                  </li>
                );
              })}
            </ul>

            {remainingIssuesCount > 0 && (
              <div className="error-remaining">
                {t('import.andMore', { count: remainingIssuesCount })}
              </div>
            )}
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          className={`drop-zone ${isDragging ? 'drop-zone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          tabIndex={0}
          role="button"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />

          <svg className="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="drop-text">{t('import.dropzone')}</p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoadSample}
          >
            {t('action.sample')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('action.import')}
          </button>
        </div>
      </div>
    </div>
  );
};
