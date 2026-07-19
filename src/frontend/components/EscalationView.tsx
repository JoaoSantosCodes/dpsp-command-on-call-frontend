import React, { useState, useEffect, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './EscalationView.css';

interface EscalationEntry {
  colaborador: string;
  cargo: string;
  nivel: string;
  contato: string;
  area: string;
  dia: number;
  horarioInicio: string;
  horarioFim: string;
  is24h: boolean;
}

interface AreaOption {
  codigo: string;
  nome: string;
  torre: string | null;
  coordenadorNome: string | null;
  coordenadorContato: string | null;
  gerenteNome: string | null;
  gerenteContato: string | null;
}

export function EscalationView(): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const [entries, setEntries] = useState<EscalationEntry[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const brasiliaStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const brasiliaDate = new Date(brasiliaStr);
  const currentMonth = brasiliaDate.getMonth() + 1;
  const currentYear = brasiliaDate.getFullYear();
  const currentDay = brasiliaDate.getDate();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const activeDay = selectedMonth === currentMonth && selectedYear === currentYear ? currentDay : 0;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNamesShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch('/api/areas/public');
      if (res.ok) {
        const data = await res.json();
        const list = data.areas || data || [];
        setAreas(list);
        if (list.length > 0 && !selectedArea) setSelectedArea(list[0].codigo);
      }
    } catch {}
  }, [selectedArea]);

  const fetchEscalation = useCallback(async () => {
    if (!selectedArea) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/escalation/schedule?area=${encodeURIComponent(selectedArea)}&month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {}
    setLoading(false);
  }, [selectedArea, selectedMonth, selectedYear]);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);
  useEffect(() => { fetchEscalation(); }, [fetchEscalation]);

  const areaInfo = areas.find(a => a.codigo === selectedArea);
  const todayEntry = entries.find(e => e.dia === activeDay);

  // Unique collaborators
  const collaborators = Array.from(
    new Map(entries.map(e => [e.colaborador, e])).values()
  ).sort((a, b) => {
    const nA = parseInt(a.nivel?.replace(/\D/g, '') || '99');
    const nB = parseInt(b.nivel?.replace(/\D/g, '') || '99');
    return nA - nB;
  });

  // Get days for a collaborator
  const getDaysForCollab = (nome: string) => entries.filter(e => e.colaborador === nome).map(e => e.dia);

  // Get horario for a collaborator (most common)
  const getHorarioForCollab = (nome: string) => {
    const e = entries.find(en => en.colaborador === nome);
    if (!e) return '—';
    return e.is24h ? '24hs' : `${e.horarioInicio} – ${e.horarioFim}`;
  };

  const getDayOfWeek = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    return dayNamesShort[date.getDay()];
  };

  return (
    <div className="esc-view">
      {/* Header */}
      <div className="esc-view__header">
        <div>
          <h1 className="esc-view__title">{areaInfo?.nome || 'Selecione uma área'}</h1>
          {areaInfo && <span className="esc-view__badge">ATIVA</span>}
        </div>
        <div className="esc-view__header-right">
          <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="esc-view__select">
            {Object.entries(
              areas.reduce((acc, area) => {
                const t = area.torre || 'Outras Áreas';
                if (!acc[t]) acc[t] = [];
                acc[t].push(area);
                return acc;
              }, {} as Record<string, AreaOption[]>)
            ).sort(([a], [b]) => a === 'Outras Áreas' ? 1 : b === 'Outras Áreas' ? -1 : a.localeCompare(b)).map(([torre, list]) => (
              <optgroup key={torre} label={`🏢 ${torre}`}>
                {list.map(a => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
              </optgroup>
            ))}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="esc-view__select">
            {monthNames.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="esc-view__select">
            <option value={currentYear - 1}>{currentYear - 1}</option>
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear + 1}>{currentYear + 1}</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="esc-view__cards">
        <div className="esc-view__card">
          <div className="esc-view__card-icon">📋</div>
          <div className="esc-view__card-content">
            <span className="esc-view__card-value">{monthNames[selectedMonth]}</span>
            <span className="esc-view__card-label">Mês Vigente</span>
          </div>
        </div>
        <div className="esc-view__card">
          <div className="esc-view__card-icon">👥</div>
          <div className="esc-view__card-content">
            <span className="esc-view__card-value">{collaborators.length}</span>
            <span className="esc-view__card-label">Plantonistas</span>
          </div>
        </div>
        <div className="esc-view__card">
          <div className="esc-view__card-icon">📅</div>
          <div className="esc-view__card-content">
            <span className="esc-view__card-value">{entries.length}/{daysInMonth}</span>
            <span className="esc-view__card-label">Dias Cobertos</span>
          </div>
        </div>
        <div className={`esc-view__card ${todayEntry ? 'esc-view__card--highlight' : 'esc-view__card--warn'}`}>
          <div className="esc-view__card-icon">🔔</div>
          <div className="esc-view__card-content">
            <span className="esc-view__card-value">{todayEntry ? todayEntry.colaborador.split(' ').slice(0, 2).join(' ') : 'Sem cobertura'}</span>
            <span className="esc-view__card-label">Plantão Hoje</span>
          </div>
        </div>
      </div>

      {/* Plantonista do Dia + Coordenação */}
      {areaInfo && (
        <div className="esc-view__today-section">
          <h3 className="esc-view__section-title">🛡️ Escalação de Hoje — {String(activeDay || '—').toString().padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}</h3>
          <div className="esc-view__today-grid">
            <div className={`esc-view__today-item ${todayEntry ? 'esc-view__today-item--active' : 'esc-view__today-item--empty'}`}>
              <span className="esc-view__today-role">🔔 PLANTONISTA DO DIA</span>
              {todayEntry ? (
                <>
                  <span className="esc-view__today-name">{todayEntry.colaborador}</span>
                  <span className="esc-view__today-detail">📞 {todayEntry.contato || '—'}</span>
                  <span className="esc-view__today-detail">🕐 {todayEntry.is24h ? '24hs' : `${todayEntry.horarioInicio} às ${todayEntry.horarioFim}`}</span>
                  <span className="esc-view__today-badge">{todayEntry.nivel}</span>
                </>
              ) : (
                <span className="esc-view__today-empty">⚠️ Sem plantonista</span>
              )}
            </div>
            <div className="esc-view__today-item">
              <span className="esc-view__today-role">👔 COORDENADOR</span>
              <span className="esc-view__today-name">{areaInfo.coordenadorNome || '—'}</span>
              <span className="esc-view__today-detail">📞 {areaInfo.coordenadorContato || '—'}</span>
            </div>
            <div className="esc-view__today-item">
              <span className="esc-view__today-role">🏢 GERENTE</span>
              <span className="esc-view__today-name">{areaInfo.gerenteNome || '—'}</span>
              <span className="esc-view__today-detail">📞 {areaInfo.gerenteContato || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Plantonistas List */}
      {loading ? (
        <div className="esc-view__loading-skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card" style={{ height: '80px', marginBottom: '8px' }}>
              <div className="skeleton-title" style={{ width: '40%' }}></div>
              <div className="skeleton-desc" style={{ width: '20%' }}></div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="esc-view__empty">
          Nenhuma escala de sobreaviso cadastrada para {areaInfo?.nome || 'esta área'} em {monthNames[selectedMonth]}/{selectedYear}.
          <br />Importe a planilha de escalonamento na aba "Importar".
        </div>
      ) : (
        <div className="esc-view__plantonistas-section">
          <div className="esc-view__section-header">
            <h3 className="esc-view__section-title">📋 Escala de Sobreaviso — {monthNames[selectedMonth]} {selectedYear}</h3>
          </div>
          <table className="esc-view__table">
            <thead>
              <tr>
                <th>Plantonista</th>
                <th>Contato</th>
                <th>Dias Escalados</th>
                <th>Horários</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map((colab, idx) => {
                const days = getDaysForCollab(colab.colaborador);
                const horario = getHorarioForCollab(colab.colaborador);
                return (
                  <tr key={idx}>
                    <td>
                      <div className="esc-view__plantonista-cell">
                        <div className="esc-view__plantonista-avatar">{colab.colaborador.charAt(0)}</div>
                        <div>
                          <div className="esc-view__plantonista-name">{colab.colaborador}</div>
                          <div className="esc-view__plantonista-cargo">{colab.cargo || colab.nivel}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="esc-view__contato">📞 {colab.contato || '—'}</div>
                    </td>
                    <td>
                      <div className="esc-view__days">
                        {days.map(d => (
                          <span key={d} className={`esc-view__day-badge ${d === activeDay ? 'esc-view__day-badge--today' : ''}`}>
                            {getDayOfWeek(d)} {String(d).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="esc-view__horario">{horario}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function formatElapsedTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

export function getElapsedSeconds(startDate: Date | string): number {
  const d = typeof startDate === 'string' || typeof startDate === 'number' || (startDate as any) instanceof Date ? new Date(startDate) : new Date();
  if (isNaN(d.getTime())) return 0;
  const elapsed = Math.floor((Date.now() - d.getTime()) / 1000);
  return elapsed < 0 ? 0 : elapsed;
}

export default EscalationView;
