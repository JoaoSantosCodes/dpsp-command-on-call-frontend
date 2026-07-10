import React, { useState, useEffect, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import { MonitorDetailModal } from './MonitorDetailModal';
import type { ActiveIncident, ConnectionStatus, Monitor } from '../../shared/types';
import './Dashboard.css';

interface AreaScheduleInfo {
  areaCodigo: string;
  areaNome: string;
  temPlantonista: boolean;
  plantonistas: Array<{
    nome: string;
    horarioInicio: string;
    horarioFim: string;
    is24h: boolean;
    cargo?: string;
    nivel?: string;
  }>;
}

/**
 * Dashboard layout:
 * - Header: Command Center + Horário Brasília + Datadog status
 * - Main area: Grid of Datadog monitors in Alert state
 * - Bottom bar: Area cards with plantonista name + schedule
 */
export function Dashboard(): React.ReactElement {
  const monitors = useCommandCenterStore((state) => state.monitors);
  const activeIncidents = useCommandCenterStore((state) => state.activeIncidents);
  const connectionStatus = useCommandCenterStore((state) => state.connectionStatus);
  const token = useCommandCenterStore((state) => state.token);
  const selectedAreas = useCommandCenterStore((state) => state.selectedAreas);

  const [areaSchedules, setAreaSchedules] = useState<AreaScheduleInfo[]>([]);
  const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);

  // Fetch monitors from API
  const fetchMonitors = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/monitors', { headers });
      if (res.ok) {
        const data = await res.json();
        setAllMonitors(data);
        // Also update store if it's empty (no WebSocket data)
        if (data.length > 0 && monitors.length === 0) {
          useCommandCenterStore.getState().setMonitors(data);
        }
      }
    } catch { /* silent */ }
  }, [token, monitors.length]);

  // Fetch area + schedule data from escalation API
  const fetchAreaData = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Fetch on-call data from escalation import
      const onCallRes = await fetch('/api/escalation/on-call', { headers });
      if (onCallRes.ok) {
        const onCallData = await onCallRes.json();
        const schedules: AreaScheduleInfo[] = onCallData.map((item: any) => ({
          areaCodigo: item.area,
          areaNome: item.area,
          temPlantonista: item.temPlantonista !== false,
          plantonistas: (item.plantonistas || []).map((p: any) => ({
            nome: p.nome,
            horarioInicio: p.horarioInicio || '',
            horarioFim: p.horarioFim || '',
            is24h: p.is24h || false,
            cargo: p.cargo || '',
            nivel: p.nivel || '',
          })),
        }));
        setAreaSchedules(schedules);
        return;
      }

      // Fallback: fetch from areas API
      const areasRes = await fetch('/api/areas', { headers });
      if (!areasRes.ok) return;
      const areasData = await areasRes.json();
      const areas = areasData.areas || areasData || [];

      const filtered = selectedAreas.length > 0
        ? areas.filter((a: any) => selectedAreas.includes(a.codigo))
        : areas;

      const schedules: AreaScheduleInfo[] = filtered.map((area: any) => ({
        areaCodigo: area.codigo,
        areaNome: area.nome,
        temPlantonista: false,
        plantonistas: [],
      }));

      setAreaSchedules(schedules);
    } catch { /* silent */ }
  }, [token, selectedAreas]);

  useEffect(() => {
    fetchMonitors();
    fetchAreaData();
    const interval = setInterval(() => {
      fetchMonitors();
      fetchAreaData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMonitors, fetchAreaData]);

  // Use store monitors if available, otherwise API-fetched ones
  const displayMonitors = monitors.length > 0 ? monitors : allMonitors;
  const alertMonitors = displayMonitors.filter((m) => m.state === 'Alert');

  // Modal state
  const [selectedMonitor, setSelectedMonitor] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter alert monitors by search
  const filteredAlertMonitors = searchQuery
    ? alertMonitors.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : alertMonitors;

  return (
    <div className="dashboard">
      <Header connectionStatus={connectionStatus} />
      <div className="dashboard-search">
        <input
          className="dashboard-search__input"
          type="text"
          placeholder="🔍 Buscar monitor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <MonitorGrid alertMonitors={filteredAlertMonitors} allMonitors={displayMonitors} onMonitorClick={(m) => setSelectedMonitor({ id: m.id, name: m.name })} />
      <AreaBar areas={areaSchedules} />
      {selectedMonitor && (
        <MonitorDetailModal
          monitorId={selectedMonitor.id}
          monitorName={selectedMonitor.name}
          onClose={() => setSelectedMonitor(null)}
        />
      )}
    </div>
  );
}

/** Header with Brasilia clock and Datadog status */
function Header({ connectionStatus }: { connectionStatus: ConnectionStatus }): React.ReactElement {
  const [clock, setClock] = useState('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setClock(now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusLabel: Record<ConnectionStatus, string> = {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    reconnecting: 'Reconectando...',
  };

  return (
    <header className="dashboard-header">
      <h1>Command Center</h1>
      <div className="dashboard-clock">🕐 {clock}</div>
      <div className="connection-status">
        <span className={`status-indicator ${connectionStatus}`} />
        <span>Datadog: {statusLabel[connectionStatus]}</span>
      </div>
    </header>
  );
}

/** Main area: Grid showing monitors in alert */
function MonitorGrid({ alertMonitors, allMonitors, onMonitorClick }: { alertMonitors: Monitor[]; allMonitors: Monitor[]; onMonitorClick: (m: Monitor) => void }): React.ReactElement {
  if (allMonitors.length === 0) {
    return (
      <div className="monitor-grid-area">
        <div className="monitor-grid-empty">
          <p>Nenhum monitor carregado do Datadog</p>
          <p className="monitor-grid-hint">Os monitores aparecerão aqui conforme forem detectados pela API do Datadog</p>
        </div>
      </div>
    );
  }

  if (alertMonitors.length === 0) {
    return (
      <div className="monitor-grid-area">
        <div className="monitor-grid-empty monitor-grid-ok">
          <p>✓ Nenhum monitor em alerta</p>
          <p className="monitor-grid-hint">{allMonitors.length} monitores monitorados — todos OK</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitor-grid-area">
      <div className="monitor-grid-title">
        🚨 Monitores em Alerta ({alertMonitors.length})
      </div>
      <div className="monitor-grid">
        {alertMonitors.map((m) => (
          <div key={m.id} className="monitor-card monitor-card--alert" onClick={() => onMonitorClick(m)} role="button" tabIndex={0}>
            <div className="monitor-card__status" />
            <div className="monitor-card__name">{m.name}</div>
            <div className="monitor-card__team">{m.teamId || 'Sem time'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bottom bar: Area cards with plantonista info */
function AreaBar({ areas }: { areas: AreaScheduleInfo[] }): React.ReactElement {
  if (areas.length === 0) {
    return (
      <div className="area-bar">
        <div className="area-bar__empty">Importe o CSV de escalonamento para ver as áreas e plantonistas</div>
      </div>
    );
  }

  return (
    <div className="area-bar">
      {areas.map((area) => (
        <div key={area.areaCodigo} className={`area-bar__card ${area.temPlantonista ? 'area-bar__card--active' : 'area-bar__card--no-schedule'}`}>
          <div className="area-bar__area-name">{area.areaNome}</div>
          {area.temPlantonista ? (
            <div className="area-bar__plantonistas">
              {area.plantonistas.map((p, i) => (
                <div key={i} className="area-bar__plantonista">
                  <span className="area-bar__person">👤 {p.nome}</span>
                  <span className="area-bar__time">{p.is24h ? '24h' : p.horarioInicio && p.horarioFim ? `${p.horarioInicio} → ${p.horarioFim}` : ''}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="area-bar__team-fallback">
              <span className="area-bar__no-schedule-label">⚠ Sem plantonista hoje — Equipe:</span>
              <div className="area-bar__team-list">
                {area.plantonistas.slice(0, 5).map((p, i) => (
                  <span key={i} className="area-bar__team-member">👤 {p.nome}</span>
                ))}
                {area.plantonistas.length > 5 && (
                  <span className="area-bar__team-more">+{area.plantonistas.length - 5} mais</span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
