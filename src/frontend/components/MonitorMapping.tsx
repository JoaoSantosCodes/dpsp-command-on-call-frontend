import React, { useState, useEffect, useCallback } from 'react';
import type { Monitor, MonitorMapping as MonitorMappingType, TeamPanel } from '../../shared/types';
import { useCommandCenterStore } from '../store/command-center-store';
import './MonitorMapping.css';

/**
 * MonitorMapping component — interface for associating Datadog monitors to teams.
 * Uses dropdown selection for assigning unmapped monitors to teams.
 * Mapping changes are applied immediately via API call.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

export interface MonitorMappingProps {
  /** API base URL, defaults to empty string (same origin) */
  apiBaseUrl?: string;
}

interface MappingState {
  mappings: MonitorMappingType[];
  loading: boolean;
  error: string | null;
}

export function MonitorMapping({ apiBaseUrl = '' }: MonitorMappingProps): React.ReactElement {
  const monitors = useCommandCenterStore((state) => state.monitors);
  const teams = useCommandCenterStore((state) => state.teams);

  const [mappingState, setMappingState] = useState<MappingState>({
    mappings: [],
    loading: true,
    error: null,
  });
  const [updatingMonitorId, setUpdatingMonitorId] = useState<number | null>(null);

  const fetchMappings = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/monitor-mappings`);
      if (!response.ok) {
        throw new Error('Falha ao carregar mapeamentos');
      }
      const data: MonitorMappingType[] = await response.json();
      setMappingState({ mappings: data, loading: false, error: null });
    } catch (err) {
      setMappingState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }));
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const handleAssignMonitor = useCallback(async (monitorId: number, teamId: string) => {
    if (!teamId) return;

    setUpdatingMonitorId(monitorId);

    try {
      const response = await fetch(`${apiBaseUrl}/api/monitor-mappings/${monitorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar mapeamento');
      }

      // Refresh mappings after successful update
      await fetchMappings();
    } catch (err) {
      setMappingState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao mapear monitor',
      }));
    } finally {
      setUpdatingMonitorId(null);
    }
  }, [apiBaseUrl, fetchMappings]);

  const handleRemoveMapping = useCallback(async (monitorId: number) => {
    setUpdatingMonitorId(monitorId);

    try {
      const response = await fetch(`${apiBaseUrl}/api/monitor-mappings/${monitorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: null }),
      });

      if (!response.ok) {
        throw new Error('Falha ao remover mapeamento');
      }

      await fetchMappings();
    } catch (err) {
      setMappingState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro ao remover mapeamento',
      }));
    } finally {
      setUpdatingMonitorId(null);
    }
  }, [apiBaseUrl, fetchMappings]);

  // Derive unmapped monitors: monitors without a mapping entry
  const mappedMonitorIds = new Set(mappingState.mappings.map((m) => m.monitorId));
  const unmappedMonitors = monitors.filter((m) => !mappedMonitorIds.has(m.id));

  // Group mapped monitors by team
  const mappedByTeam = new Map<string, MonitorMappingType[]>();
  for (const mapping of mappingState.mappings) {
    const teamMappings = mappedByTeam.get(mapping.teamId) || [];
    teamMappings.push(mapping);
    mappedByTeam.set(mapping.teamId, teamMappings);
  }

  if (mappingState.loading) {
    return (
      <div className="monitor-mapping">
        <h2 className="monitor-mapping__title">Mapeamento de Monitores</h2>
        <p className="monitor-mapping__loading">Carregando mapeamentos...</p>
      </div>
    );
  }

  return (
    <div className="monitor-mapping">
      <h2 className="monitor-mapping__title">Mapeamento de Monitores</h2>

      {mappingState.error && (
        <div className="monitor-mapping__error" role="alert">
          {mappingState.error}
        </div>
      )}

      <UnmappedSection
        monitors={unmappedMonitors}
        teams={teams}
        onAssign={handleAssignMonitor}
        updatingMonitorId={updatingMonitorId}
      />

      <MappedSection
        mappedByTeam={mappedByTeam}
        teams={teams}
        onRemove={handleRemoveMapping}
        updatingMonitorId={updatingMonitorId}
      />
    </div>
  );
}

/** Section displaying unmapped monitors with team assignment dropdown */
function UnmappedSection({
  monitors,
  teams,
  onAssign,
  updatingMonitorId,
}: {
  monitors: Monitor[];
  teams: TeamPanel[];
  onAssign: (monitorId: number, teamId: string) => void;
  updatingMonitorId: number | null;
}): React.ReactElement {
  return (
    <div className="monitor-mapping__section">
      <h3 className="monitor-mapping__section-title monitor-mapping__section-title--unmapped">
        Não Mapeados ({monitors.length})
      </h3>

      {monitors.length === 0 ? (
        <p className="monitor-mapping__empty">
          Todos os monitores estão mapeados a um time.
        </p>
      ) : (
        <ul className="monitor-mapping__list" role="list">
          {monitors.map((monitor) => (
            <li key={monitor.id} className="monitor-mapping__item">
              <span className="monitor-mapping__monitor-name">{monitor.name}</span>
              <select
                className="monitor-mapping__select"
                defaultValue=""
                disabled={updatingMonitorId === monitor.id}
                onChange={(e) => onAssign(monitor.id, e.target.value)}
                aria-label={`Associar monitor ${monitor.name} a um time`}
              >
                <option value="" disabled>
                  Selecionar time...
                </option>
                {teams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
              {updatingMonitorId === monitor.id && (
                <span className="monitor-mapping__spinner" aria-label="Atualizando..." />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Section displaying monitors already mapped, grouped by team */
function MappedSection({
  mappedByTeam,
  teams,
  onRemove,
  updatingMonitorId,
}: {
  mappedByTeam: Map<string, MonitorMappingType[]>;
  teams: TeamPanel[];
  onRemove: (monitorId: number) => void;
  updatingMonitorId: number | null;
}): React.ReactElement {
  const teamNameMap = new Map(teams.map((t) => [t.teamId, t.teamName]));

  return (
    <div className="monitor-mapping__section">
      <h3 className="monitor-mapping__section-title">
        Mapeados ({Array.from(mappedByTeam.values()).flat().length})
      </h3>

      {mappedByTeam.size === 0 ? (
        <p className="monitor-mapping__empty">
          Nenhum monitor mapeado ainda.
        </p>
      ) : (
        <div className="monitor-mapping__teams">
          {Array.from(mappedByTeam.entries()).map(([teamId, teamMappings]) => (
            <div key={teamId} className="monitor-mapping__team-group">
              <h4 className="monitor-mapping__team-name">
                {teamNameMap.get(teamId) || teamId}
              </h4>
              <ul className="monitor-mapping__list" role="list">
                {teamMappings.map((mapping) => (
                  <li key={mapping.monitorId} className="monitor-mapping__item monitor-mapping__item--mapped">
                    <span className="monitor-mapping__monitor-name">
                      {mapping.monitorName}
                    </span>
                    <button
                      className="monitor-mapping__remove-btn"
                      onClick={() => onRemove(mapping.monitorId)}
                      disabled={updatingMonitorId === mapping.monitorId}
                      aria-label={`Remover mapeamento do monitor ${mapping.monitorName}`}
                    >
                      ✕
                    </button>
                    {updatingMonitorId === mapping.monitorId && (
                      <span className="monitor-mapping__spinner" aria-label="Atualizando..." />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MonitorMapping;
