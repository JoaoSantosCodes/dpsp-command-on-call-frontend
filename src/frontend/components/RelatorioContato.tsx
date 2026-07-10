import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';

interface ContatoLog {
  id: number; plantonista: string; area_codigo: string; problema_codigo: string | null;
  data: string; hora: string; status: string; registrado_por: string; created_at: string;
}

interface AreaInfo { codigo: string; nome: string; }

export function RelatorioContato(): React.ReactElement {
  const token = useCommandCenterStore((s) => s.token);
  const [logs, setLogs] = useState<ContatoLog[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterData, setFilterData] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      let url = '/api/contato-log?';
      if (filterData) url += `data=${filterData}&`;
      if (filterArea) url += `areaCodigo=${filterArea}&`;
      const r = await fetch(url, { headers });
      if (r.ok) setLogs(await r.json());
    } catch {} finally { setLoading(false); }
  }, [token, filterData, filterArea]);

  const fetchAreas = useCallback(async () => {
    try { const r = await fetch('/api/areas/public'); if (r.ok) { const d = await r.json(); setAreas(d.areas || d || []); } } catch {}
  }, []);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const getAreaNome = (c: string) => areas.find(a => a.codigo === c)?.nome || c;

  const filtered = logs.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    return true;
  });

  const stats = { total: filtered.length, atendido: filtered.filter(l => l.status === 'atendido').length, naoAtendido: filtered.filter(l => l.status === 'nao_atendido').length, pendente: filtered.filter(l => l.status === 'pendente').length };

  const exportCSV = () => {
    let csv = 'Data,Hora,Plantonista,Área,Problema,Status,Registrado Por\n';
    for (const l of filtered) {
      csv += `${l.data},${l.hora},"${l.plantonista}","${getAreaNome(l.area_codigo)}","${l.problema_codigo || ''}",${l.status},"${l.registrado_por}"\n`;
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `relatorio_contato_${filterData || 'todos'}.csv`; link.click();
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--page-text)', marginBottom: '1rem' }}>Relatório de Contato</h1>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={statStyle}><div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--badge-indigo-text)' }}>{stats.total}</div><div style={{ fontSize: '0.65rem', color: 'var(--page-text-dim)', textTransform: 'uppercase' }}>Total</div></div>
        <div style={statStyle}><div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--badge-green-text)' }}>{stats.atendido}</div><div style={{ fontSize: '0.65rem', color: 'var(--page-text-dim)', textTransform: 'uppercase' }}>Atendido</div></div>
        <div style={statStyle}><div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--badge-red-text)' }}>{stats.naoAtendido}</div><div style={{ fontSize: '0.65rem', color: 'var(--page-text-dim)', textTransform: 'uppercase' }}>Não Atendido</div></div>
        <div style={statStyle}><div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--badge-yellow-text)' }}>{stats.pendente}</div><div style={{ fontSize: '0.65rem', color: 'var(--page-text-dim)', textTransform: 'uppercase' }}>Pendente</div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--page-text-muted)', textTransform: 'uppercase' }}>Data</label>
          <input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--page-text-muted)', textTransform: 'uppercase' }}>Área</label>
          <select value={filterArea} onChange={e => setFilterArea(e.target.value)} style={inputStyle}>
            <option value="">Todas</option>
            {areas.filter(a => a.codigo !== 'PENDENTE_APROVACAO').map(a => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--page-text-muted)', textTransform: 'uppercase' }}>Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="atendido">Atendido</option>
            <option value="nao_atendido">Não Atendido</option>
          </select>
        </div>
        <button onClick={exportCSV} style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>📤 Exportar CSV</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ background: 'var(--surface-bg)' }}>
            <tr>
              <th style={thStyle}>Data</th><th style={thStyle}>Hora</th><th style={thStyle}>Plantonista</th>
              <th style={thStyle}>Área</th><th style={thStyle}>Problema</th><th style={thStyle}>Status</th><th style={thStyle}>Por</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--page-text-dim)' }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--page-text-dim)' }}>Nenhum registro encontrado</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--row-border)' }}>
                <td style={tdStyle}>{l.data}</td>
                <td style={tdStyle}>{l.hora}</td>
                <td style={tdStyle}>{l.plantonista}</td>
                <td style={tdStyle}>{getAreaNome(l.area_codigo)}</td>
                <td style={tdStyle}>{l.problema_codigo || '—'}</td>
                <td style={tdStyle}><span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', background: l.status === 'atendido' ? 'var(--badge-green-bg)' : l.status === 'nao_atendido' ? 'var(--badge-red-bg)' : 'var(--badge-yellow-bg)', color: l.status === 'atendido' ? 'var(--badge-green-text)' : l.status === 'nao_atendido' ? 'var(--badge-red-text)' : 'var(--badge-yellow-text)' }}>{l.status === 'nao_atendido' ? 'Não Atendido' : l.status === 'atendido' ? 'Atendido' : 'Pendente'}</span></td>
                <td style={tdStyle}>{l.registrado_por}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const statStyle: React.CSSProperties = { background: 'var(--stat-bg)', border: '1px solid var(--stat-border)', borderRadius: '8px', padding: '0.5rem 1rem', textAlign: 'center', minWidth: '80px' };
const inputStyle: React.CSSProperties = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.45rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--th-color)', textTransform: 'uppercase', fontSize: '0.65rem', borderBottom: '1px solid var(--th-border)' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', color: 'var(--page-text)' };

export default RelatorioContato;
