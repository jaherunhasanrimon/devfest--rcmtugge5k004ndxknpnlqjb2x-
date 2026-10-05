import React, { useState } from 'react';
import { useI18n } from '../i18n';

export const Legend: React.FC = () => {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`map-legend ${collapsed ? 'legend-collapsed' : ''}`}>
      <button
        type="button"
        className="legend-header"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <span className="legend-title">{t('term.legend')}</span>
        <span className="legend-toggle-icon">{collapsed ? '▲' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-symbol symbol-room"></span>
            <span className="legend-label">{t('type.room')}</span>
          </div>

          <div className="legend-item">
            <span className="legend-symbol symbol-junction"></span>
            <span className="legend-label">{t('type.junction')}</span>
          </div>

          <div className="legend-item">
            <span className="legend-symbol symbol-exit"></span>
            <span className="legend-label">{t('type.exit')} ({t('term.unblocked')})</span>
          </div>

          <div className="legend-item">
            <span className="legend-symbol symbol-exit-closed"></span>
            <span className="legend-label">{t('term.closed')} {t('type.exit')}</span>
          </div>

          <div className="legend-item">
            <span className="legend-symbol symbol-corridor"></span>
            <span className="legend-label">{t('term.corridor')}</span>
          </div>

          <div className="legend-item">
            <span className="legend-symbol symbol-blocked"></span>
            <span className="legend-label">{t('term.blocked')} (✕)</span>
          </div>

          <div className="legend-item">
            <span className="legend-symbol symbol-start"></span>
            <span className="legend-label">{t('term.start')}</span>
          </div>

          <div className="legend-item">
            <span className="legend-symbol symbol-route"></span>
            <span className="legend-label">{t('term.route')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
