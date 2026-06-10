import React from 'react';
import type { TeamPanel as TeamPanelData, OnCallPerson, ActiveIncident } from '../../shared/types';
import './TeamPanel.css';

/**
 * Props for the TeamPanel component.
 * Displays team information including on-call person, shift times,
 * and alerts for missing configuration.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.4
 */
export interface TeamPanelProps {
  teamId: string;
  teamName: string;
  currentOnCall: OnCallPerson | null;
  shiftStart: string;
  shiftEnd: string;
  activeIncidents: ActiveIncident[];
  escalationChainConfigured: boolean;
}

/**
 * TeamPanel component — displays a single team's on-call status,
 * shift times, and alerts within the Command Center dashboard.
 *
 * - Shows team name prominently
 * - Displays current on-call person name and shift start/end times
 * - Shows "Sem Plantonista" alert when no on-call person is assigned
 * - Shows "Configuração Incompleta" alert when escalation chain is empty
 * - Highlights visually when the team has active incidents
 */
export function TeamPanel({
  teamId,
  teamName,
  currentOnCall,
  shiftStart,
  shiftEnd,
  activeIncidents,
  escalationChainConfigured,
}: TeamPanelProps): React.ReactElement {
  const hasActiveIncidents = activeIncidents.length > 0;

  const panelClassName = [
    'team-panel',
    hasActiveIncidents ? 'team-panel--incident-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={panelClassName} data-team-id={teamId}>
      <div className="team-panel__header">
        <h2 className="team-panel__name">{teamName}</h2>
        {hasActiveIncidents && (
          <span className="team-panel__incident-badge">
            {activeIncidents.length}
          </span>
        )}
      </div>

      <div className="team-panel__body">
        {currentOnCall ? (
          <OnCallInfo
            person={currentOnCall}
            shiftStart={shiftStart}
            shiftEnd={shiftEnd}
          />
        ) : (
          <AlertBadge type="warning" message="Sem Plantonista" />
        )}

        {!escalationChainConfigured && (
          <AlertBadge type="config" message="Configuração Incompleta" />
        )}
      </div>
    </div>
  );
}

/** Displays the current on-call person's name and shift schedule */
function OnCallInfo({
  person,
  shiftStart,
  shiftEnd,
}: {
  person: OnCallPerson;
  shiftStart: string;
  shiftEnd: string;
}): React.ReactElement {
  return (
    <div className="team-panel__oncall">
      <span className="team-panel__oncall-label">Plantonista</span>
      <span className="team-panel__oncall-name">{person.name}</span>
      <div className="team-panel__shift">
        <span className="team-panel__shift-time">
          {shiftStart} — {shiftEnd}
        </span>
      </div>
    </div>
  );
}

/** Displays an alert badge (warning or configuration) */
function AlertBadge({
  type,
  message,
}: {
  type: 'warning' | 'config';
  message: string;
}): React.ReactElement {
  return (
    <div className={`team-panel__alert team-panel__alert--${type}`}>
      <span className="team-panel__alert-icon">
        {type === 'warning' ? '⚠' : '⚙'}
      </span>
      <span className="team-panel__alert-message">{message}</span>
    </div>
  );
}

export default TeamPanel;
