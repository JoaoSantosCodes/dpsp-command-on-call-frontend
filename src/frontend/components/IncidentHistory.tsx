import React, { useEffect, useState } from 'react';
import type { IncidentRecord, EscalationEvent, HistoryFilters, TeamPanel } from '../../shared/types';
import './IncidentHistory.css';

/**
 * Props for the IncidentHistory component.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */
export interface IncidentHistoryProps {
  teams: TeamPanel[];
}

type IncidentStatus = IncidentRecord['status'];

const STATUS_LABELS: Record<IncidentStatus, string> = {
  active: 'Ativo',
  acknowledged: 'Atendido',
  resolved: 'Resolvido',
  escalation_exhausted: 'Escalação Esgotada',
};

/**
 * IncidentHistory component — displays incident history with:
 * - Filterable table of past and current incidents
 * - Filters by team, period (date range), and status
 * - Expandable detail view with escalation timeline
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */
export function IncidentHistory({ teams }: IncidentHistoryProps): React.ReactElement {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [escalationEvents, setEscalationEvents] = useState<Record<string, EscalationEvent[]>>({});
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents(filters);
  }, [filters]);

  async function fetchIncidents(currentFilters: HistoryFilters): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.teamId) params.set('teamId', currentFilters.teamId);
      if (currentFilters.startDate) params.set('startDate', currentFilters.startDate);
      if (currentFilters.endDate) params.set('endDate', currentFilters.endDate);
      if (currentFilters.status) params.set('status', currentFilters.status);

      const response = await fetch(`/api/incidents?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Erro ao carregar histórico: ${response.status}`);
      }
      const data: IncidentRecord[] = await response.json();
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEscalationEvents(incidentId: string): Promise<void> {
    if (escalationEvents[incidentId]) return;
    try {
      const response = await fetch(`/api/incidents/${incidentId}/escalations`);
      if (!response.ok) return;
      const data: EscalationEvent[] = await response.json();
      setEscalationEvents((prev) => ({ ...prev, [incidentId]: data }));
    } catch {
      // Silently fail for escalation detail loading
    }
  }

  function handleToggleDetail(incidentId: string): void {
    if (expandedIncidentId === incidentId) {
      setExpandedIncidentId(null);
    } else {
      setExpandedIncidentId(incidentId);
      fetchEscalationEvents(incidentId);
    }
  }

  function handleFilterChange(newFilters: Partial<HistoryFilters>): void {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }

  return (
    <div className="incident-history">
      <div className="incident-history__header">
        <h2 className="incident-history__title">Histórico de Intercorrências</h2>
      </div>

      <IncidentFilters
        teams={teams}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <div className="incident-history__body">
        {loading && (
          <div className="incident-history__loading">Carregando...</div>
        )}

        {error && (
          <div className="incident-history__error">{error}</div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <div className="incident-history__empty">
            Nenhuma intercorrência encontrada para os filtros selecionados.
          </div>
        )}

        {!loading && !error && incidents.length > 0 && (
          <IncidentTable
            incidents={incidents}
            expandedIncidentId={expandedIncidentId}
            escalationEvents={escalationEvents}
            onToggleDetail={handleToggleDetail}
          />
        )}
      </div>
    </div>
  );
}

/** Filters section for team, date range, and status */
function IncidentFilters({
  teams,
  filters,
  onFilterChange,
}: {
  teams: TeamPanel[];
  filters: HistoryFilters;
  onFilterChange: (filters: Partial<HistoryFilters>) => void;
}): React.ReactElement {
  return (
    <div className="incident-filters">
      <div className="incident-filters__field">
        <label className="incident-filters__label" htmlFor="filter-team">
          Time
        </label>
        <select
          id="filter-team"
          className="incident-filters__select"
          value={filters.teamId || ''}
          onChange={(e) => onFilterChange({ teamId: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          {teams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>
      </div>

      <div className="incident-filters__field">
        <label className="incident-filters__label" htmlFor="filter-start-date">
          De
        </label>
        <input
          id="filter-start-date"
          type="date"
          className="incident-filters__input"
          value={filters.startDate || ''}
          onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
        />
      </div>

      <div className="incident-filters__field">
        <label className="incident-filters__label" htmlFor="filter-end-date">
          Até
        </label>
        <input
          id="filter-end-date"
          type="date"
          className="incident-filters__input"
          value={filters.endDate || ''}
          onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
        />
      </div>

      <div className="incident-filters__field">
        <label className="incident-filters__label" htmlFor="filter-status">
          Status
        </label>
        <select
          id="filter-status"
          className="incident-filters__select"
          value={filters.status || ''}
          onChange={(e) =>
            onFilterChange({
              status: (e.target.value || undefined) as IncidentStatus | undefined,
            })
          }
        >
          <option value="">Todos</option>
          <option value="active">Ativo</option>
          <option value="acknowledged">Atendido</option>
          <option value="resolved">Resolvido</option>
          <option value="escalation_exhausted">Escalação Esgotada</option>
        </select>
      </div>
    </div>
  );
}

/** Table displaying incident records with expandable rows */
function IncidentTable({
  incidents,
  expandedIncidentId,
  escalationEvents,
  onToggleDetail,
}: {
  incidents: IncidentRecord[];
  expandedIncidentId: string | null;
  escalationEvents: Record<string, EscalationEvent[]>;
  onToggleDetail: (incidentId: string) => void;
}): React.ReactElement {
  return (
    <table className="incident-table" role="table">
      <thead className="incident-table__head">
        <tr>
          <th className="incident-table__th"></th>
          <th className="incident-table__th">Monitor</th>
          <th className="incident-table__th">Time</th>
          <th className="incident-table__th">Plantonista</th>
          <th className="incident-table__th">Início</th>
          <th className="incident-table__th">Status</th>
          <th className="incident-table__th">Resolvido por</th>
        </tr>
      </thead>
      <tbody className="incident-table__body">
        {incidents.map((incident) => (
          <React.Fragment key={incident.id}>
            <IncidentRow
              incident={incident}
              isExpanded={expandedIncidentId === incident.id}
              onToggle={() => onToggleDetail(incident.id)}
            />
            {expandedIncidentId === incident.id && (
              <tr className="incident-table__detail-row">
                <td colSpan={7} className="incident-table__detail-cell">
                  <IncidentDetail
                    incident={incident}
                    escalations={escalationEvents[incident.id] || []}
                  />
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

/** Single incident row in the table */
function IncidentRow({
  incident,
  isExpanded,
  onToggle,
}: {
  incident: IncidentRecord;
  isExpanded: boolean;
  onToggle: () => void;
}): React.ReactElement {
  const statusClass = `incident-table__status--${incident.status.replace('_', '-')}`;

  return (
    <tr
      className={`incident-table__row ${isExpanded ? 'incident-table__row--expanded' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-expanded={isExpanded}
      aria-label={`Incidente ${incident.monitorName} - ${STATUS_LABELS[incident.status]}`}
    >
      <td className="incident-table__td incident-table__td--toggle">
        <span className={`incident-table__expand-icon ${isExpanded ? 'incident-table__expand-icon--open' : ''}`}>
          ▶
        </span>
      </td>
      <td className="incident-table__td">{incident.monitorName}</td>
      <td className="incident-table__td">{incident.teamId}</td>
      <td className="incident-table__td">{incident.onCallPerson}</td>
      <td className="incident-table__td">{formatDateTime(incident.startedAt)}</td>
      <td className="incident-table__td">
        <span className={`incident-table__status ${statusClass}`}>
          {STATUS_LABELS[incident.status]}
        </span>
      </td>
      <td className="incident-table__td">{incident.resolvedBy || '—'}</td>
    </tr>
  );
}

/** Expandable detail section showing escalation timeline */
function IncidentDetail({
  incident,
  escalations,
}: {
  incident: IncidentRecord;
  escalations: EscalationEvent[];
}): React.ReactElement {
  return (
    <div className="incident-detail">
      <div className="incident-detail__summary">
        <div className="incident-detail__field">
          <span className="incident-detail__label">Monitor ID:</span>
          <span className="incident-detail__value">{incident.monitorId}</span>
        </div>
        {incident.acknowledgedAt && (
          <div className="incident-detail__field">
            <span className="incident-detail__label">Atendido em:</span>
            <span className="incident-detail__value">
              {formatDateTime(incident.acknowledgedAt)} por {incident.acknowledgedBy || '—'}
            </span>
          </div>
        )}
        {incident.resolvedAt && (
          <div className="incident-detail__field">
            <span className="incident-detail__label">Resolvido em:</span>
            <span className="incident-detail__value">
              {formatDateTime(incident.resolvedAt)} por {incident.resolvedBy || '—'}
            </span>
          </div>
        )}
      </div>

      <div className="incident-detail__timeline">
        <h4 className="incident-detail__timeline-title">Linha do Tempo de Escalação</h4>
        {escalations.length === 0 ? (
          <p className="incident-detail__no-escalations">
            Nenhuma escalação registrada para este incidente.
          </p>
        ) : (
          <ul className="escalation-timeline" role="list">
            {escalations.map((event, index) => (
              <EscalationTimelineItem key={index} event={event} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Individual item in the escalation timeline */
function EscalationTimelineItem({
  event,
}: {
  event: EscalationEvent;
}): React.ReactElement {
  return (
    <li className="escalation-timeline__item">
      <div className="escalation-timeline__marker" />
      <div className="escalation-timeline__content">
        <span className="escalation-timeline__level">
          Nível {event.escalationLevel}
        </span>
        <span className="escalation-timeline__transfer">
          {event.fromPerson} → {event.toPerson}
        </span>
        <span className="escalation-timeline__time">
          {formatDateTime(event.createdAt)}
        </span>
      </div>
    </li>
  );
}

/** Format a Date or string to a human-readable date/time */
export function formatDateTime(date: Date | string | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Get the CSS class modifier for a given status */
export function getStatusClassName(status: IncidentStatus): string {
  return `incident-table__status--${status.replace('_', '-')}`;
}

export default IncidentHistory;
