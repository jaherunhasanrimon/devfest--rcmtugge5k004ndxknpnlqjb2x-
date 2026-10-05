import React, { useState, useMemo } from 'react';
import { useApp } from '../state/store';
import { useI18n } from '../i18n';
import { GNode, GEdge } from '../core';

interface MapViewProps {
  hoveredNodeId?: string | null;
}

interface ActivePopover {
  type: 'node' | 'edge';
  id: string;
  x: number;
  y: number;
}

export const MapView: React.FC<MapViewProps> = ({ hoveredNodeId }) => {
  const { state, dispatch, routeResult } = useApp();
  const { t } = useI18n();
  const [popover, setPopover] = useState<ActivePopover | null>(null);

  const building = state.building;
  const hazards = state.session.hazards;
  const startId = state.session.startId;

  const blockedNodesSet = useMemo(() => new Set(hazards.blockedNodes), [hazards.blockedNodes]);
  const blockedEdgesSet = useMemo(() => new Set(hazards.blockedEdges), [hazards.blockedEdges]);
  const closedExitsSet = useMemo(() => new Set(hazards.closedExits), [hazards.closedExits]);

  const routeNodeSet = useMemo(() => {
    if (routeResult.status === 'route') {
      return new Set(routeResult.nodePath);
    }
    return new Set<string>();
  }, [routeResult]);

  const routeEdgeSet = useMemo(() => {
    if (routeResult.status === 'route') {
      return new Set(routeResult.edgePath);
    }
    return new Set<string>();
  }, [routeResult]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GNode>();
    if (building) {
      for (const n of building.nodes) {
        map.set(n.id, n);
      }
    }
    return map;
  }, [building]);

  // Compute bounding box
  const viewBox = useMemo(() => {
    if (!building || building.nodes.length === 0) {
      return '0 0 600 400';
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const n of building.nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const padding = 70;
    const width = Math.max(maxX - minX + padding * 2, 400);
    const height = Math.max(maxY - minY + padding * 2, 300);
    const x = minX - padding;
    const y = minY - padding;

    return `${x} ${y} ${width} ${height}`;
  }, [building]);

  if (!building) {
    return (
      <div className="map-view-empty">
        <p>{t('import.subtitle')}</p>
      </div>
    );
  }

  const handleNodeClick = (e: React.MouseEvent, node: GNode) => {
    e.stopPropagation();
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mapContainer = document.querySelector('.map-container');
    const containerRect = mapContainer ? mapContainer.getBoundingClientRect() : { left: 0, top: 0 };

    setPopover({
      type: 'node',
      id: node.id,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    });
  };

  const handleEdgeClick = (e: React.MouseEvent, edge: GEdge) => {
    e.stopPropagation();
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mapContainer = document.querySelector('.map-container');
    const containerRect = mapContainer ? mapContainer.getBoundingClientRect() : { left: 0, top: 0 };

    setPopover({
      type: 'edge',
      id: edge.id,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    });
  };

  const closePopover = () => setPopover(null);

  return (
    <div className="map-container" onClick={closePopover}>
      <svg
        className="map-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Evacuation building map"
      >
        <defs>
          {/* Diagonal hatch pattern for blocked nodes */}
          <pattern
            id="blocked-hatch"
            width="8"
            height="8"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#C5303B" strokeWidth="2.5" />
          </pattern>
        </defs>

        {/* 1. EDGES / CORRIDORS */}
        <g className="edges-layer">
          {building.edges.map(edge => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const isBlockedEdge = blockedEdgesSet.has(edge.id);
            const isEndpointBlocked =
              blockedNodesSet.has(edge.from) ||
              blockedNodesSet.has(edge.to) ||
              closedExitsSet.has(edge.from) ||
              closedExitsSet.has(edge.to);
            const isOnRoute = routeEdgeSet.has(edge.id);

            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;

            let edgeClass = 'edge-corridor';
            if (isOnRoute) edgeClass += ' edge-route';
            else if (isBlockedEdge) edgeClass += ' edge-blocked';
            else if (isEndpointBlocked) edgeClass += ' edge-unusable';

            return (
              <g
                key={edge.id}
                className={`edge-group ${edgeClass}`}
                data-testid={`edge-${edge.id}`}
                onClick={e => handleEdgeClick(e, edge)}
                tabIndex={0}
                role="button"
                aria-label={`Corridor ${edge.id} between ${fromNode.label} and ${toNode.label}, cost ${edge.cost}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleEdgeClick(e as unknown as React.MouseEvent, edge);
                  }
                }}
              >
                {/* Route Halo */}
                {isOnRoute && (
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    className="edge-halo"
                  />
                )}

                {/* Base Corridor Line */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  className="edge-line"
                />

                {/* Invisible wide hit area for easy tapping */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  className="edge-hit-area"
                />

                {/* Blocked corridor "✕" badge */}
                {isBlockedEdge && (
                  <g className="edge-blocked-badge" transform={`translate(${midX}, ${midY})`}>
                    <circle r="9" className="blocked-badge-bg" />
                    <text dy="3.5" textAnchor="middle" className="blocked-badge-text">
                      ✕
                    </text>
                  </g>
                )}

                {/* Cost Chip (when not blocked badge) */}
                {!isBlockedEdge && (
                  <g
                    className={`cost-chip-group ${isOnRoute ? 'cost-chip-route' : ''}`}
                    transform={`translate(${midX}, ${midY})`}
                  >
                    <rect
                      x="-14"
                      y="-10"
                      width="28"
                      height="20"
                      rx="6"
                      className="cost-chip-rect"
                    />
                    <text dy="4" textAnchor="middle" className="cost-chip-text">
                      {edge.cost}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* 2. NODES */}
        <g className="nodes-layer">
          {building.nodes.map(node => {
            const isStart = startId === node.id;
            const isBlockedNode = blockedNodesSet.has(node.id);
            const isClosedExit = closedExitsSet.has(node.id);
            const isOnRoute = routeNodeSet.has(node.id);
            const isHovered = hoveredNodeId === node.id;

            let nodeClass = `node-item node-type-${node.type}`;
            if (isStart) nodeClass += ' node-start';
            if (isBlockedNode) nodeClass += ' node-blocked';
            if (isClosedExit) nodeClass += ' node-closed';
            if (isOnRoute) nodeClass += ' node-on-route';
            if (isHovered) nodeClass += ' node-hovered';

            return (
              <g
                key={node.id}
                className={nodeClass}
                data-testid={`node-${node.id}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={e => handleNodeClick(e, node)}
                tabIndex={0}
                role="button"
                aria-label={`${node.label} (${node.id}), type ${node.type}${
                  isStart ? ', start location' : ''
                }${isBlockedNode ? ', blocked' : ''}${isClosedExit ? ', closed exit' : ''}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleNodeClick(e as unknown as React.MouseEvent, node);
                  }
                }}
              >
                {/* Start Node Pulse Ring */}
                {isStart && (
                  <circle
                    r={node.type === 'exit' ? 28 : node.type === 'room' ? 26 : 20}
                    className="start-pulse-ring"
                  />
                )}

                {/* Node Shape */}
                {node.type === 'room' && (
                  <rect
                    x="-18"
                    y="-18"
                    width="36"
                    height="36"
                    rx="8"
                    className="room-shape"
                    fill={isBlockedNode ? 'url(#blocked-hatch)' : '#FFFFFF'}
                  />
                )}

                {node.type === 'junction' && (
                  <circle
                    r="11"
                    className="junction-shape"
                    fill={isBlockedNode ? 'url(#blocked-hatch)' : '#FFFFFF'}
                  />
                )}

                {node.type === 'exit' && (
                  <g className="exit-shape-group">
                    <rect
                      x="-26"
                      y="-15"
                      width="52"
                      height="30"
                      rx="15"
                      className="exit-shape"
                    />
                    {/* Door arrow glyph for exit */}
                    {!isClosedExit ? (
                      <g className="exit-door-icon" transform="translate(-6, -6)">
                        <path
                          d="M3 2h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm5 4l-2-2v1.5H3v1h3V8l2-2z"
                          fill="#FFFFFF"
                        />
                      </g>
                    ) : (
                      // Red bar across closed exit
                      <line
                        x1="-18"
                        y1="0"
                        x2="18"
                        y2="0"
                        stroke="#C5303B"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                )}

                {/* Blocked glyph "✕" for rooms and junctions */}
                {isBlockedNode && (
                  <text dy="4.5" textAnchor="middle" className="blocked-glyph">
                    ✕
                  </text>
                )}

                {/* Start Flag Badge */}
                {isStart && (
                  <g className="start-flag-badge" transform="translate(12, -18)">
                    <rect x="-3" y="-3" width="22" height="14" rx="4" className="start-flag-bg" />
                    <text x="8" y="7" textAnchor="middle" className="start-flag-text">
                      S
                    </text>
                  </g>
                )}

                {/* Node Label below */}
                <text
                  y={node.type === 'exit' ? 28 : node.type === 'room' ? 30 : 25}
                  textAnchor="middle"
                  className="node-label"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* POPUP / ACTION MENU */}
      {popover && (
        <div
          className="map-popover"
          style={{ left: `${popover.x}px`, top: `${popover.y}px` }}
          onClick={e => e.stopPropagation()}
        >
          {popover.type === 'node' && (() => {
            const node = nodeMap.get(popover.id);
            if (!node) return null;
            const isExit = node.type === 'exit';
            const isBlocked = blockedNodesSet.has(node.id);
            const isClosed = closedExitsSet.has(node.id);
            const isStart = startId === node.id;

            return (
              <div className="popover-content">
                <div className="popover-header">
                  <strong>{node.label}</strong>
                  <span className="popover-badge">{node.id}</span>
                </div>

                <div className="popover-actions">
                  {!isExit && !isBlocked && (
                    <button
                      type="button"
                      className="popover-btn primary"
                      onClick={() => {
                        dispatch({ type: 'SELECT_START', payload: isStart ? null : node.id });
                        closePopover();
                      }}
                    >
                      {isStart ? t('term.unblocked') : t('action.setStart')}
                    </button>
                  )}

                  {!isExit ? (
                    <button
                      type="button"
                      className={`popover-btn ${isBlocked ? 'success' : 'danger'}`}
                      onClick={() => {
                        dispatch({ type: 'TOGGLE_NODE_BLOCK', payload: node.id });
                        closePopover();
                      }}
                    >
                      {isBlocked ? t('action.unblock') : t('action.block')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`popover-btn ${isClosed ? 'success' : 'danger'}`}
                      onClick={() => {
                        dispatch({ type: 'TOGGLE_EXIT_CLOSED', payload: node.id });
                        closePopover();
                      }}
                    >
                      {isClosed ? t('action.reopen') : t('action.close')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {popover.type === 'edge' && (() => {
            const edge = building.edges.find(e => e.id === popover.id);
            if (!edge) return null;
            const isBlocked = blockedEdgesSet.has(edge.id);
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);

            return (
              <div className="popover-content">
                <div className="popover-header">
                  <strong>{t('term.corridor')} {edge.id}</strong>
                  <span className="popover-badge">{t('term.cost')}: {edge.cost}</span>
                </div>
                <div className="popover-sub">
                  {fromNode?.label || edge.from} ↔ {toNode?.label || edge.to}
                </div>

                <div className="popover-actions">
                  <button
                    type="button"
                    className={`popover-btn ${isBlocked ? 'success' : 'danger'}`}
                    onClick={() => {
                      dispatch({ type: 'TOGGLE_EDGE_BLOCK', payload: edge.id });
                      closePopover();
                    }}
                  >
                    {isBlocked ? t('action.unblock') : t('action.block')}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
