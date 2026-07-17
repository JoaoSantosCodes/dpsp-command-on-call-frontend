import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import type { Area, Periodo, Escala, User } from '../../shared/types';

/**
 * EscalaManagement component — CRUD screen for managing Escalas.
 * Layout padronizado conforme tela "Gestão de Usuários".
 */
export function EscalaManagement(): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const token = useCommandCenterStore((state) => state.token);
  const selectedAreas = useCommandCenterStore((state) => state.selectedAreas);

  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [plantonistas, setPlantonistas] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterPlantonista, setFilterPlantonista] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterAno, setFilterAno] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEscala, setEditingEscala] = useState<Escala | null>(null);
  const [formAreaCodigo, setFormAreaCodigo] = useState('');
  const [formUsuarioCodigo, setFormUsuarioCodigo] = useState('');
  const [formMes, setFormMes] = useState(() => String(new Date().getMonth() + 1));
  const [formAno, setFormAno] = useState(() => String(new Date().getFullYear()));
  const [formDia, setFormDia] = useState('');
  const [formHorario, setFormHorario] = useState('');
  const [formEntradas, setFormEntradas] = useState<Array<{horario: string; data: string}>>([]);
  const [formPeriodoCodigo, setFormPeriodoCodigo] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  if (!user || (user.perfil !== 'Adm' && user.perfil !== 'Responsavel')) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }} role="alert">
          Acesso restrito. Apenas administradores e responsáveis podem gerenciar escalas.
        </div>
      </div>
    );
  }

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchEscalas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let allEscalas: Escala[] = [];
      // Admin always fetches all escalas; others filter by selectedAreas
      const shouldFilterByArea = user?.perfil !== 'Adm' && selectedAreas.length > 0;
      if (shouldFilterByArea) {
        const promises = selectedAreas.map(async (areaCodigo) => {
          const response = await fetch(`/api/escalas?areaCodigo=${encodeURIComponent(areaCodigo)}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!response.ok) throw new Error('Erro ao carregar escalas.');
          const data = await response.json();
          return (data.escalas || data || []) as Escala[];
        });
        const results = await Promise.all(promises);
        allEscalas = results.flat();
      } else {
        const response = await fetch('/api/escalas', { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Erro ao carregar escalas.');
        const data = await response.json();
        allEscalas = data.escalas || data || [];
      }
      setEscalas(allEscalas);
    } catch { setError('Erro ao carregar escalas.'); }
    finally { setLoading(false); }
  }, [token, selectedAreas, user?.perfil]);

  const fetchAreas = useCallback(async () => {
    try {
      const response = await fetch('/api/areas', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      setAreas(data.areas || data || []);
    } catch {}
  }, [token]);

  const fetchPeriodos = useCallback(async (areaCodigo?: string) => {
    try {
      const url = areaCodigo ? `/api/periodos?areaCodigo=${encodeURIComponent(areaCodigo)}` : '/api/periodos';
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      setPeriodos(data.periodos || data || []);
    } catch { setPeriodos([]); }
  }, [token]);

  const fetchPlantonistas = useCallback(async () => {
    try {
      const response = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      const allUsers: User[] = data.users || data || [];
      setPlantonistas(allUsers.filter((u) => u.perfil === 'Plantonista'));
    } catch { setPlantonistas([]); }
  }, [token]);

  useEffect(() => { fetchEscalas(); fetchAreas(); fetchPlantonistas(); fetchPeriodos(); }, [fetchEscalas, fetchAreas, fetchPlantonistas, fetchPeriodos]);

  useEffect(() => {
    if (formAreaCodigo) { fetchPeriodos(formAreaCodigo); }
  }, [formAreaCodigo, fetchPeriodos]);

  const getAreaNome = useCallback((areaCodigo: string): string => {
    const area = areas.find((a) => a.codigo === areaCodigo);
    return area ? area.nome : areaCodigo;
  }, [areas]);

  const getPeriodoDisplay = useCallback((periodoCodigo: string): string => {
    const periodo = periodos.find((p) => p.codigo === periodoCodigo);
    if (periodo) return `${periodo.data} (${periodo.horarios})`;
    return periodoCodigo;
  }, [periodos]);

  const getPlantonistaNome = useCallback((usuarioCodigo: string): string => {
    const plantonista = plantonistas.find((p) => p.codigo === usuarioCodigo);
    return plantonista ? plantonista.nome : usuarioCodigo;
  }, [plantonistas]);

  const filteredPlantonistas = formAreaCodigo
    ? plantonistas.filter((p) => p.areaCodigo === formAreaCodigo || !p.areaCodigo)
    : plantonistas;

  const handleNew = useCallback(() => {
    setEditingEscala(null);
    setFormAreaCodigo(''); setFormUsuarioCodigo(''); setFormDia(''); setFormPeriodoCodigo('');
    setFormHorario(''); setFormEntradas([]);
    setFormMes(String(new Date().getMonth() + 1)); setFormAno(String(new Date().getFullYear()));
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  const handleEdit = useCallback((escala: Escala) => {
    setEditingEscala(escala);
    setFormAreaCodigo(escala.areaCodigo); setFormUsuarioCodigo(escala.usuarioCodigo);
    setFormPeriodoCodigo(escala.periodoCodigo); setFormDia('');
    setFormMes(String(new Date().getMonth() + 1)); setFormAno(String(new Date().getFullYear()));

    const periodo = periodos.find(p => p.codigo === escala.periodoCodigo);
    if (periodo) {
      setFormEntradas([{ horario: periodo.horarios, data: periodo.data }]);
    } else {
      setFormEntradas([]);
    }

    setShowForm(true); setError(null); setSuccess(null);
  }, [periodos]);

  const handleClone = useCallback((escala: Escala) => {
    setEditingEscala(null);
    setFormAreaCodigo(escala.areaCodigo); setFormUsuarioCodigo(escala.usuarioCodigo);
    setFormPeriodoCodigo(escala.periodoCodigo); setFormDia('');
    setFormMes(String(new Date().getMonth() + 1)); setFormAno(String(new Date().getFullYear()));

    const periodo = periodos.find(p => p.codigo === escala.periodoCodigo);
    if (periodo) {
      setFormEntradas([{ horario: periodo.horarios, data: periodo.data }]);
    } else {
      setFormEntradas([]);
    }

    setShowForm(true); setError(null); setSuccess(null);
  }, [periodos]);

  const handleCancel = useCallback(() => { setShowForm(false); setEditingEscala(null); }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!formAreaCodigo) { setError('Área é obrigatória.'); return; }
    if (!formUsuarioCodigo) { setError('Plantonista é obrigatório.'); return; }
    if (formEntradas.length === 0) { setError('Adicione pelo menos uma data.'); return; }

    setFormLoading(true);
    try {
      if (editingEscala) {
        if (formEntradas.length !== 1) {
          setError('Ao editar, você deve manter apenas 1 data/horário na lista.');
          setFormLoading(false);
          return;
        }
        const entrada = formEntradas[0];
        const periodoRes = await fetch('/api/periodos', {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ data: entrada.data, horarios: entrada.horario, areaCodigo: formAreaCodigo }),
        });
        let periodoCodigo = '';
        if (periodoRes.ok) {
          const periodoData = await periodoRes.json();
          periodoCodigo = periodoData.codigo;
        } else {
          const existingRes = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(formAreaCodigo)}`, { headers: { Authorization: `Bearer ${token}` } });
          if (existingRes.ok) {
            const existingData = await existingRes.json();
            const perList = existingData.periodos || existingData || [];
            const match = perList.find((p: any) => p.data === entrada.data && p.horarios === entrada.horario);
            if (match) periodoCodigo = match.codigo;
          }
        }
        if (!periodoCodigo) { setError('Erro ao resolver período da edição.'); setFormLoading(false); return; }

        await fetch(`/api/escalas/${editingEscala.id}`, {
          method: 'PUT', headers: authHeaders,
          body: JSON.stringify({ codigo: editingEscala.codigo, areaCodigo: formAreaCodigo, periodoCodigo, usuarioCodigo: formUsuarioCodigo }),
        });
        setSuccess('Escala atualizada!');
      } else {
        for (const entrada of formEntradas) {
          const periodoRes = await fetch('/api/periodos', {
            method: 'POST', headers: authHeaders,
            body: JSON.stringify({ data: entrada.data, horarios: entrada.horario, areaCodigo: formAreaCodigo }),
          });
  
          let periodoCodigo = '';
          if (periodoRes.ok) {
            const periodoData = await periodoRes.json();
            periodoCodigo = periodoData.codigo;
          } else {
            const existingRes = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(formAreaCodigo)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (existingRes.ok) {
              const existingData = await existingRes.json();
              const perList = existingData.periodos || existingData || [];
              const match = perList.find((p: any) => p.data === entrada.data && p.horarios === entrada.horario);
              if (match) periodoCodigo = match.codigo;
            }
          }
          if (!periodoCodigo) continue;
  
          const codigo = `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
          await fetch('/api/escalas', {
            method: 'POST', headers: authHeaders,
            body: JSON.stringify({ codigo, areaCodigo: formAreaCodigo, periodoCodigo, usuarioCodigo: formUsuarioCodigo }),
          });
        }
        setSuccess('Escala criada!');
      }
      setShowForm(false); setEditingEscala(null); await fetchEscalas();
    } catch { setError('Erro ao conectar.'); }
    finally { setFormLoading(false); }
  }, [formAreaCodigo, formUsuarioCodigo, formEntradas, editingEscala, authHeaders, fetchEscalas, token]);

  const handleDelete = useCallback(async (escala: Escala) => {
    if (!confirm(`Deseja deletar a escala "${escala.codigo}"?`)) return;
    setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/escalas/${escala.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json(); setError(data.error || 'Erro ao deletar escala.'); return; }
      setSuccess('Escala deletada com sucesso!'); await fetchEscalas();
    } catch { setError('Erro ao conectar com o servidor.'); }
  }, [token, fetchEscalas]);

  const filtered = escalas.filter(esc => {
    let match = true;
    if (search) {
      const s = search.toLowerCase();
      match = match && (esc.codigo.toLowerCase().includes(s) || getPlantonistaNome(esc.usuarioCodigo).toLowerCase().includes(s) || getAreaNome(esc.areaCodigo).toLowerCase().includes(s));
    }
    if (filterArea) match = match && esc.areaCodigo === filterArea;
    if (filterPlantonista) match = match && esc.usuarioCodigo === filterPlantonista;
    if (filterMes || filterAno) {
      const p = periodos.find(per => per.codigo === esc.periodoCodigo);
      if (p) {
        if (filterMes) match = match && p.data.split('-')[1] === filterMes.padStart(2, '0');
        if (filterAno) match = match && p.data.split('-')[0] === filterAno;
      }
    }
    return match;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--page-text)', marginBottom: '1rem' }}>Cadastro de Escalas</h1>

      {error && <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{success}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={{ background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }} value={filterArea} onChange={e => setFilterArea(e.target.value)}>
          <option value="">Todas as Áreas</option>
          {areas.map(a => <option key={a.id} value={a.codigo}>{a.nome}</option>)}
        </select>
        <select style={{ background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }} value={filterPlantonista} onChange={e => setFilterPlantonista(e.target.value)}>
          <option value="">Todos os Plantonistas</option>
          {plantonistas.map(p => <option key={p.id} value={p.codigo}>{p.nome}</option>)}
        </select>
        <select style={{ background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }} value={filterMes} onChange={e => setFilterMes(e.target.value)}>
          <option value="">Qualquer Mês</option>
          <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option>
          <option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option>
          <option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option>
          <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
        </select>
        <select style={{ background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }} value={filterAno} onChange={e => setFilterAno(e.target.value)}>
          <option value="">Qualquer Ano</option>
          <option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
        </select>
        <input style={{ flex: 1, minWidth: '200px', background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }} placeholder="🔍 Buscar por código..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={handleNew} style={{ background: 'var(--btn-primary-bg)', border: 'none', color: 'var(--btn-primary-text)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>+ Nova Escala</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ background: 'var(--surface-bg)' }}>
            <tr>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Plantonista</th>
              <th style={thStyle}>Área</th>
              <th style={thStyle}>Período</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--page-text-dim)' }}>{loading ? 'Carregando...' : 'Nenhuma escala cadastrada.'}</td></tr>
            ) : filtered.map(escala => (
              <tr key={escala.id} style={{ borderBottom: '1px solid var(--row-border)' }}>
                <td style={tdStyle}><span style={{ background: 'var(--badge-indigo-bg)', color: 'var(--badge-indigo-text)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>{escala.codigo}</span></td>
                <td style={tdStyle}>{getPlantonistaNome(escala.usuarioCodigo)}</td>
                <td style={tdStyle}>{getAreaNome(escala.areaCodigo)}</td>
                <td style={tdStyle}>{getPeriodoDisplay(escala.periodoCodigo)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => handleEdit(escala)} style={editBtnStyle}>Editar</button>
                    <button onClick={() => handleClone(escala)} style={{ ...editBtnStyle, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}>Clonar</button>
                    <button onClick={() => handleDelete(escala)} style={{ ...editBtnStyle, background: '#dc2626', color: '#fff' }}>Deletar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação/Edição */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={handleCancel}>
          <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--page-text)', marginBottom: '1rem' }}>{editingEscala ? 'Editar Escala' : 'Nova Escala'}</h2>
            <form onSubmit={handleSave}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Área *</label>
                <select style={inputStyle} value={formAreaCodigo} onChange={(e) => { setFormAreaCodigo(e.target.value); setFormUsuarioCodigo(''); setFormPeriodoCodigo(''); setFormEntradas([]); }} required>
                  <option value="">Selecione uma área</option>
                  {areas.map((area) => (<option key={area.id} value={area.codigo}>{area.nome}</option>))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Plantonista *</label>
                <select style={inputStyle} value={formUsuarioCodigo} onChange={(e) => setFormUsuarioCodigo(e.target.value)} required disabled={!formAreaCodigo}>
                  <option value="">Selecione o plantonista</option>
                  {filteredPlantonistas.map((p) => (<option key={p.id} value={p.codigo}>{p.nome}</option>))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Mês</label>
                  <select style={inputStyle} value={formMes} onChange={(e) => setFormMes(e.target.value)}>
                    <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option>
                    <option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option>
                    <option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option>
                    <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Ano</label>
                  <select style={inputStyle} value={formAno} onChange={(e) => setFormAno(e.target.value)}>
                    <option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                  </select>
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Horários e Datas</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <select style={{ ...inputStyle, flex: '1 1 auto', minWidth: '150px' }} value={formHorario} onChange={(e) => setFormHorario(e.target.value)}>
                    <option value="">Horário</option>
                    {periodos.length > 0 ? [...new Set(periodos.map(p => p.horarios))].map((h, i) => (<option key={`extra-${i}`} value={h}>{h}</option>)) : <option disabled>Nenhum horário na área</option>}
                  </select>
                  <select style={{ ...inputStyle, flex: '1 1 auto', minWidth: '120px' }} value={formDia} onChange={(e) => setFormDia(e.target.value)}>
                    <option value="">Dia</option>
                    {Array.from({ length: new Date(Number(formAno), Number(formMes), 0).getDate() }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${formAno}-${formMes.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const weekday = new Date(Number(formAno), Number(formMes) - 1, day).toLocaleDateString('pt-BR', { weekday: 'short' });
                      return (<option key={day} value={dateStr}>{String(day).padStart(2, '0')} - {weekday}</option>);
                    })}
                  </select>
                  <button type="button" style={{ background: 'var(--btn-primary-bg)', border: 'none', color: 'var(--btn-primary-text)', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      if (formDia && formHorario && !formEntradas.find(x => x.data === formDia)) {
                        setFormEntradas([...formEntradas, { horario: formHorario, data: formDia }].sort((a, b) => a.data.localeCompare(b.data)));
                        setFormDia('');
                      }
                    }}>+ Adicionar</button>
                </div>

                {formEntradas.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {formEntradas.map((item) => (
                      <div key={item.data} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--badge-indigo-bg)', border: '1px solid var(--btn-edit-border)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--badge-indigo-text)', fontWeight: 500 }}>🕐 {item.horario}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--page-text)', margin: '0 0.5rem' }}>|</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--page-text)' }}>📅 {item.data}</span>
                        <button type="button" onClick={() => setFormEntradas(formEntradas.filter(x => x.data !== item.data))} style={{ background: 'none', border: 'none', color: 'var(--error-text)', cursor: 'pointer', fontSize: '1rem', padding: 0, marginLeft: '0.5rem' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={{ color: 'var(--error-text)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={handleCancel} style={{ flex: 1, padding: '0.6rem', background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', color: 'var(--btn-cancel-text)', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={formLoading || !formAreaCodigo || !formUsuarioCodigo || formEntradas.length === 0} style={{ flex: 1, padding: '0.6rem', background: 'var(--btn-primary-bg)', border: 'none', color: 'var(--btn-primary-text)', borderRadius: '8px', cursor: 'pointer', opacity: formLoading ? 0.5 : 1 }}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--th-color)', textTransform: 'uppercase', fontSize: '0.65rem', borderBottom: '1px solid var(--th-border)' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', color: 'var(--page-text)' };
const editBtnStyle: React.CSSProperties = { background: 'var(--btn-edit-bg)', border: '1px solid var(--btn-edit-border)', color: 'var(--btn-edit-text)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--page-text-muted)', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' };

export default EscalaManagement;
