import React, { useState, useEffect } from 'react';
import { useApp } from '../state/store';
import { useI18n } from '../i18n';
import { RouteCard } from './RouteCard';
import { HazardLists } from './HazardLists';

interface SidePanelProps {
  onHoverNode?: (nodeId: string | null) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ onHoverNode }) => {
  const { state, dispatch, isInitialState } = useApp();
  const { t } = useI18n();
  const [showResetNotice, setShowResetNotice] = useState(false);

  const building = state.building;
  const startId = state.session.startId;
  const blockedNodesSet = new Set(state.session.hazards.blockedNodes);

  // Group selectable starting nodes
  const rooms = building ? building.nodes.filter(n => n.type === 'room') : [];
  const junctions = building ? building.nodes.filter(n => n.type === 'junction') : [];

  const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    dispatch({ type: 'SELECT_START', payload: val ? val : null });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    setShowResetNotice(true);
  };

  useEffect(() => {
    if (showResetNotice) {
      const timer = setTimeout(() => setShowResetNotice(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showResetNotice]);

  if (!building) return null;

  return (
    <aside className="side-panel">
      {/* 1. Route Hero Card */}
      <RouteCard onHoverNode={onHoverNode} />

      {/* 2. Start Location Selection */}
      <div className="side-section start-select-section">
        <label htmlFor="start-node-select" className="section-label">
          {t('term.selectStart')}
        </label>
        <select
          id="start-node-select"
          className="start-select"
          value={startId || ''}
          onChange={handleStartChange}
        >
          <option value="">-- {t('status.idle')} --</option>
          {rooms.length > 0 && (
            <optgroup label={t('type.room')}>
              {rooms.map(room => {
                const isBlocked = blockedNodesSet.has(room.id);
                return (
                  <option key={room.id} value={room.id} disabled={isBlocked}>
                    {room.label} ({room.id}){isBlocked ? ` - (${t('term.blocked')})` : ''}
                  </option>
                );
              })}
            </optgroup>
          )}
          {junctions.length > 0 && (
            <optgroup label={t('type.junction')}>
              {junctions.map(junc => {
                const isBlocked = blockedNodesSet.has(junc.id);
                return (
                  <option key={junc.id} value={junc.id} disabled={isBlocked}>
                    {junc.label} ({junc.id}){isBlocked ? ` - (${t('term.blocked')})` : ''}
                  </option>
                );
              })}
            </optgroup>
          )}
        </select>
      </div>

      {/* 3. Hazards Toggle Lists */}
      <div className="side-section hazards-section">
        <div className="section-header">
          <span className="section-label">{t('term.hazards')}</span>
        </div>
        <HazardLists />
      </div>

      {/* 4. Reset Hazards Button */}
      <div className="side-section reset-section">
        <button
          type="button"
          className="btn btn-secondary btn-reset"
          data-testid="reset-button"
          onClick={handleReset}
          disabled={isInitialState}
        >
          <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          {t('action.reset')}
        </button>

        {showResetNotice && (
          <div className="reset-notice" role="status">
            {t('action.hazardsRestored')}
          </div>
        )}
      </div>
    </aside>
  );
};
