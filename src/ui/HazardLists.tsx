import React, { useState } from 'react';
import { useApp } from '../state/store';
import { useI18n } from '../i18n';

export const HazardLists: React.FC = () => {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'nodes' | 'edges' | 'exits'>('nodes');

  const building = state.building;
  if (!building) return null;

  const hazards = state.session.hazards;
  const blockedNodesSet = new Set(hazards.blockedNodes);
  const blockedEdgesSet = new Set(hazards.blockedEdges);
  const closedExitsSet = new Set(hazards.closedExits);

  const roomsAndJunctions = building.nodes.filter(n => n.type === 'room' || n.type === 'junction');
  const exits = building.nodes.filter(n => n.type === 'exit');

  const activeBlockedNodesCount = roomsAndJunctions.filter(n => blockedNodesSet.has(n.id)).length;
  const activeBlockedEdgesCount = building.edges.filter(e => blockedEdgesSet.has(e.id)).length;
  const activeClosedExitsCount = exits.filter(n => closedExitsSet.has(n.id)).length;

  const nodeMap = new Map<string, string>();
  for (const n of building.nodes) {
    nodeMap.set(n.id, n.label);
  }

  return (
    <div className="hazards-panel">
      <div className="hazards-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'nodes'}
          className={`tab-btn ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          {t('term.roomsJunctions')}
          {activeBlockedNodesCount > 0 && (
            <span className="tab-count-badge">{activeBlockedNodesCount}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'edges'}
          className={`tab-btn ${activeTab === 'edges' ? 'active' : ''}`}
          onClick={() => setActiveTab('edges')}
        >
          {t('term.corridors')}
          {activeBlockedEdgesCount > 0 && (
            <span className="tab-count-badge">{activeBlockedEdgesCount}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'exits'}
          className={`tab-btn ${activeTab === 'exits' ? 'active' : ''}`}
          onClick={() => setActiveTab('exits')}
        >
          {t('term.exits')}
          {activeClosedExitsCount > 0 && (
            <span className="tab-count-badge">{activeClosedExitsCount}</span>
          )}
        </button>
      </div>

      <div className="hazards-list">
        {/* TAB 1: Rooms & Junctions */}
        {activeTab === 'nodes' && (
          <div className="tab-content" role="tabpanel">
            {roomsAndJunctions.map(node => {
              const isBlocked = blockedNodesSet.has(node.id);
              return (
                <div key={node.id} className={`hazard-row ${isBlocked ? 'row-hazard' : ''}`}>
                  <div className="hazard-info">
                    <span className="hazard-title">{node.label}</span>
                    <span className="hazard-meta">
                      {node.id} &bull; {t(`type.${node.type}` as any)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`switch-toggle ${isBlocked ? 'switch-blocked' : 'switch-clear'}`}
                    onClick={() => dispatch({ type: 'TOGGLE_NODE_BLOCK', payload: node.id })}
                    aria-label={`Toggle blocked state for ${node.label}`}
                    aria-pressed={isBlocked}
                  >
                    <span className="switch-slider"></span>
                    <span className="switch-text">{isBlocked ? t('term.blocked') : t('term.unblocked')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Corridors */}
        {activeTab === 'edges' && (
          <div className="tab-content" role="tabpanel">
            {building.edges.map(edge => {
              const isBlocked = blockedEdgesSet.has(edge.id);
              const fromLabel = nodeMap.get(edge.from) || edge.from;
              const toLabel = nodeMap.get(edge.to) || edge.to;

              return (
                <div key={edge.id} className={`hazard-row ${isBlocked ? 'row-hazard' : ''}`}>
                  <div className="hazard-info">
                    <span className="hazard-title">
                      {edge.id}: {fromLabel} ↔ {toLabel}
                    </span>
                    <span className="hazard-meta">
                      {t('term.cost')}: {edge.cost}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`switch-toggle ${isBlocked ? 'switch-blocked' : 'switch-clear'}`}
                    onClick={() => dispatch({ type: 'TOGGLE_EDGE_BLOCK', payload: edge.id })}
                    aria-label={`Toggle blocked state for corridor ${edge.id}`}
                    aria-pressed={isBlocked}
                  >
                    <span className="switch-slider"></span>
                    <span className="switch-text">{isBlocked ? t('term.blocked') : t('term.unblocked')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: Exits */}
        {activeTab === 'exits' && (
          <div className="tab-content" role="tabpanel">
            {exits.map(exit => {
              const isClosed = closedExitsSet.has(exit.id);
              return (
                <div key={exit.id} className={`hazard-row ${isClosed ? 'row-hazard' : ''}`}>
                  <div className="hazard-info">
                    <span className="hazard-title">{exit.label}</span>
                    <span className="hazard-meta">{exit.id} &bull; {t('type.exit')}</span>
                  </div>
                  <button
                    type="button"
                    className={`switch-toggle ${isClosed ? 'switch-blocked' : 'switch-clear'}`}
                    onClick={() => dispatch({ type: 'TOGGLE_EXIT_CLOSED', payload: exit.id })}
                    aria-label={`Toggle closed state for exit ${exit.label}`}
                    aria-pressed={isClosed}
                  >
                    <span className="switch-slider"></span>
                    <span className="switch-text">{isClosed ? t('term.closed') : t('term.unblocked')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
