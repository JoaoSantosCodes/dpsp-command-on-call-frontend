import React from 'react';
import type { Monitor, MonitorState } from '../../shared/types';
import './MonitorList.css';

/**
 * Props for the MonitorList component.
 *
 * Validates: Requirements 2.1, 2.4, 9.1
 */
export interface MonitorListProps {
  /** Monitors assigned to a specific team */
  monitors: Monitor[];
  /** Monitors without any team mapping (teamId === null) */
  unmappedMonitors?: Monitor[];
}

/** Color mapping for each monitor state */
const STATE_COLORS: Record<MonitorState, string> = {
  Alert: '#ff1744',
  OK: '#00c853',
  Warn: '#ffab00',
  'No Data': '#6b7280',
  Unknown: '#6b7280',
};

/** CSS class suffix for each monitor state */
const STATE_CLASS: Record<MonitorState, string> = {
  Alert: 'alert',
  OK: 'ok',
  Warn: 'warn',
  'No Data': 'no-data',
  Unknown: 'unknown',
};

/**
 * MonitorList component — displays a list of monitors with color-coded
 * state indicators.
 *
 * - Each monitor shows its name and a colored dot representing its state
 * - Red (#ff1744) for Alert, Green (#00c853) for OK, Yellow (#ffab00) for Warn
 * - Gray for No Data / Unknown
 * - Optionally shows a "Sem Responsável" section for unmapped monitors
 *
 * Usable within TeamPanel or as a standalone section in the dashboard.
 */
export function MonitorList({
  monitors,
  unmappedMonitors = [],
}: MonitorListProps): React.ReactElement {
  return (
    <div className="monitor-list">
      {monitors.length > 0 ? (
        <ul className="monitor-list__items" role="list">
          {monitors.map((monitor) => (
            <MonitorItem key={monitor.id} monitor={monitor} />
          ))}
        </ul>
      ) : (
        <p className="monitor-list__empty">Nenhum monitor associado</p>
      )}

      {unmappedMonitors.length > 0 && (
        <div className="monitor-list__unmapped">
          <h3 className="monitor-list__unmapped-title">Sem Responsável</h3>
          <ul className="monitor-list__items" role="list">
            {unmappedMonitors.map((monitor) => (
              <MonitorItem key={monitor.id} monitor={monitor} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Individual monitor item with colored state indicator */
function MonitorItem({ monitor }: { monitor: Monitor }): React.ReactElement {
  const stateClass = STATE_CLASS[monitor.state];

  return (
    <li className={`monitor-list__item monitor-list__item--${stateClass}`}>
      <span
        className={`monitor-list__indicator monitor-list__indicator--${stateClass}`}
        style={{ backgroundColor: STATE_COLORS[monitor.state] }}
        aria-label={`Estado: ${monitor.state}`}
      />
      <span className="monitor-list__name">{monitor.name}</span>
    </li>
  );
}

export default MonitorList;
