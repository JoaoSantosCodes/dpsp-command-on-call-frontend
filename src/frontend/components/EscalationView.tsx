import React, { useEffect, useState } from 'react';
import type { ActiveIncident } from '../../shared/types';
import './EscalationView.css';

/**
 * Props for the EscalationView component.
 *
 * Validates: Requirements 5.1, 5.4, 5.5, 9.3
 */
export interface EscalationViewProps {
  activeIncidents: ActiveIncident[];
  onAcknowledge: (incidentId: string) => void;
}

/**
 * EscalationView component — displays active escalations with:
 * - Elapsed time counter for each active incident
 * - Acknowledge button to confirm incident handling
 * - Current escalation level indicator
 * - Critical alert for "Escalação Esgotada" state
 *
 * Validates: Requirements 5.1, 5.4, 5.5, 9.3
 */
export function EscalationView({
  activeIncidents,
  onAcknowledge,
}: EscalationViewProps): React.ReactElement {
  const hasIncidents = activeIncidents.length > 0;

  return (
    <div className="escalation-view">
      <div className="escalation-view__header">
        <h2 className="escalation-view__title">Escalações Ativas</h2>
        {hasIncidents && (
          <span className="escalation-view__count">{activeIncidents.length}</span>
        )}
      </div>

      <div className="escalation-view__body">
        {hasIncidents ? (
          activeIncidents.map((incident) => (
            <EscalationCard
              key={incident.id}
              incident={incident}
              onAcknowledge={onAcknowledge}
            />
          ))
        ) : (
          <div className="escalation-view__empty">
            <span className="escalation-view__empty-icon">✓</span>
            <span className="escalation-view__empty-text">
              Nenhuma escalação ativa
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual escalation card for a single active incident.
 * Displays elapsed time, escalation level, and acknowledge button.
 */
function EscalationCard({
  incident,
  onAcknowledge,
}: {
  incident: ActiveIncident;
  onAcknowledge: (incidentId: string) => void;
}): React.ReactElement {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    getElapsedSeconds(incident.startedAt)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds(incident.startedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [incident.startedAt]);

  const isExhausted = incident.timeUntilNextEscalation <= 0 && incident.currentEscalationLevel > 0;

  const cardClassName = [
    'escalation-card',
    isExhausted ? 'escalation-card--exhausted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClassName} data-incident-id={incident.id}>
      {isExhausted && (
        <div className="escalation-card__critical-alert">
          <span className="escalation-card__critical-icon">🚨</span>
          <span className="escalation-card__critical-text">Escalação Esgotada</span>
        </div>
      )}

      <div className="escalation-card__info">
        <span className="escalation-card__monitor-name">{incident.monitorName}</span>
        <span className="escalation-card__oncall">
          Plantonista: {incident.onCallPerson}
        </span>
      </div>

      <div className="escalation-card__metrics">
        <ElapsedTimeCounter elapsedSeconds={elapsedSeconds} />
        <EscalationLevelIndicator level={incident.currentEscalationLevel} />
      </div>

      <button
        className="escalation-card__acknowledge-btn"
        onClick={() => onAcknowledge(incident.id)}
        aria-label={`Confirmar atendimento para ${incident.monitorName}`}
      >
        Acknowledge
      </button>
    </div>
  );
}

/** Displays the elapsed time since incident started */
function ElapsedTimeCounter({
  elapsedSeconds,
}: {
  elapsedSeconds: number;
}): React.ReactElement {
  const formatted = formatElapsedTime(elapsedSeconds);

  return (
    <div className="escalation-card__elapsed">
      <span className="escalation-card__elapsed-label">Tempo decorrido</span>
      <span className="escalation-card__elapsed-value">{formatted}</span>
    </div>
  );
}

/** Displays the current escalation level */
function EscalationLevelIndicator({
  level,
}: {
  level: number;
}): React.ReactElement {
  return (
    <div className="escalation-card__level">
      <span className="escalation-card__level-label">Nível</span>
      <span className="escalation-card__level-value">{level}</span>
    </div>
  );
}

/** Calculate elapsed seconds from a start date to now */
export function getElapsedSeconds(startedAt: Date): number {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
}

/** Format seconds into HH:MM:SS or MM:SS */
export function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default EscalationView;
