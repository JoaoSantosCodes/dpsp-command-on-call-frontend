import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './EscalaManagement.css';

import type { Area, Periodo, Escala, User } from '../../shared/types';

/**
 * EscalaManagement component — CRUD screen for managing Escalas.
 * Accessible by users with 'Adm' or 'Responsavel' profile.
 * Provides listing, creation, editing, and deletion of escalas.
 * Escalas link an Area + Periodo + Plantonista (Tb_Escalas).
 * Filters escalas by the user's selected areas.
 *
 * Validates: Requisito Documento — Cadastro de Escala
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

  // Check access: Adm or Responsavel
  if (!user || (user.perfil !== 'Adm' && user.perfil !== 'Responsavel')) {
    return (
      <div className="escala-management">
        <div className="escala-management__denied" role="alert">
          Acesso restrito. Apenas administradores e responsáveis podem gerenciar escalas.
        </div>
      </div>
    );
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch escalas filtered by selected areas
  const fetchEscalas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let allEscalas: Escala[] = [];

      if (selectedAreas.length > 0) {
        const promises = selectedAreas.map(async (areaCodigo) => {
          const response = await fetch(`/api/escalas?areaCodigo=${encodeURIComponent(areaCodigo)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Erro ao carregar escalas.');
          const data = await response.json();
          return (data.escalas || data || []) as Escala[];
        });
        const results = await Promise.all(promises);
        allEscalas = results.flat();
      } else {
        const response = await fetch('/api/escalas', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Erro ao carregar escalas.');
        const data = await response.json();
        allEscalas = data.escalas || data || [];
      }

      setEscalas(allEscalas);
    } catch {
      setError('Erro ao carregar escalas.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedAreas]);

  // Fetch areas for dropdown
  const fetchAreas = useCallback(async () => {
    try {
      const response = await fetch('/api/areas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setAreas(data.areas || data || []);
    } catch {
      // Silently fail — areas dropdown will be empty
    }
  }, [token]);

  // Fetch periodos for a given area
  const fetchPeriodos = useCallback(async (areaCodigo: string) => {
    if (!areaCodigo) {
      setPeriodos([]);
      return;
    }
    try {
      const response = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(areaCodigo)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setPeriodos(data.periodos || data || []);
    } catch {
      setPeriodos([]);
    }
  }, [token]);

  // Fetch plantonistas (users with perfil = Plantonista)
  const fetchPlantonistas = useCallback(async () => {
    try {
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const allUsers: User[] = data.users || data || [];
      setPlantonistas(allUsers.filter((u) => u.perfil === 'Plantonista'));
    } catch {
      setPlantonistas([]);
    }
  }, [token]);

  useEffect(() => {
    fetchEscalas();
    fetchAreas();
    fetchPlantonistas();
  }, [fetchEscalas, fetchAreas, fetchPlantonistas]);

  // When form area changes, fetch periodos for that area
  useEffect(() => {
    if (formAreaCodigo) {
      fetchPeriodos(formAreaCodigo);
    } else {
      setPeriodos([]);
    }
  }, [formAreaCodigo, fetchPeriodos]);

  // Get area name by codigo
  const getAreaNome = useCallback(
    (areaCodigo: string): string => {
      const area = areas.find((a) => a.codigo === areaCodigo);
      return area ? area.nome : areaCodigo;
    },
    [areas]
  );

  // Get periodo display (data + horarios) by codigo
  const getPeriodoDisplay = useCallback(
    (periodoCodigo: string): string => {
      const periodo = periodos.find((p) => p.codigo === periodoCodigo);
      if (periodo) return `${periodo.data} (${periodo.horarios})`;
      // Search in escalas context — the periodo might not be loaded for current area filter
      return periodoCodigo;
    },
    [periodos]
  );

  // Get plantonista name by codigo
  const getPlantonistaNome = useCallback(
    (usuarioCodigo: string): string => {
      const plantonista = plantonistas.find((p) => p.codigo === usuarioCodigo);
      return plantonista ? plantonista.nome : usuarioCodigo;
    },
    [plantonistas]
  );

  // Filter plantonistas by selected area in form
  const filteredPlantonistas = formAreaCodigo
    ? plantonistas.filter((p) => p.areaCodigo === formAreaCodigo || !p.areaCodigo)
    : plantonistas;

  // Open form for new escala
  const handleNew = useCallback(() => {
    setEditingEscala(null);
    setFormAreaCodigo(''); setFormUsuarioCodigo(''); setFormDia(''); setFormPeriodoCodigo('');
    setFormHorario(''); setFormEntradas([]);
    setFormMes(String(new Date().getMonth() + 1)); setFormAno(String(new Date().getFullYear()));
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  // Open form for editing
  const handleEdit = useCallback((escala: Escala) => {
    setEditingEscala(escala);
    setFormAreaCodigo(escala.areaCodigo); setFormUsuarioCodigo(escala.usuarioCodigo);
    setFormPeriodoCodigo(escala.periodoCodigo); setFormDia('');
    setFormMes(String(new Date().getMonth() + 1)); setFormAno(String(new Date().getFullYear()));
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  // Close form
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingEscala(null);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      if (!formAreaCodigo) { setError('Área é obrigatória.'); return; }
      if (!formUsuarioCodigo) { setError('Plantonista é obrigatório.'); return; }
      if (formEntradas.length === 0) { setError('Adicione pelo menos uma data.'); return; }

      setFormLoading(true);

      try {
        // Create one escala per entry (date+horario)
        for (const entrada of formEntradas) {
          // Create periodo for this date
          const periodoRes = await fetch('/api/periodos', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ data: entrada.data, horarios: entrada.horario, areaCodigo: formAreaCodigo }),
          });

          let periodoCodigo = '';
          if (periodoRes.ok) {
            const periodoData = await periodoRes.json();
            periodoCodigo = periodoData.codigo;
          } else {
            // Try to find existing
            const existingRes = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(formAreaCodigo)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (existingRes.ok) {
              const existingData = await existingRes.json();
              const perList = existingData.periodos || existingData || [];
              const match = perList.find((p: any) => p.data === entrada.data);
              if (match) periodoCodigo = match.codigo;
            }
          }

          if (!periodoCodigo) continue;

          const codigo = `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
          await fetch('/api/escalas', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ codigo, areaCodigo: formAreaCodigo, periodoCodigo, usuarioCodigo: formUsuarioCodigo }),
          });
        }

        setSuccess('Escala criada!');
        setShowForm(false); setEditingEscala(null); await fetchEscalas();
      } catch { setError('Erro ao conectar.'); }
      finally { setFormLoading(false); }
    },
    [formAreaCodigo, formUsuarioCodigo, formDia, formPeriodoCodigo, editingEscala, authHeaders, fetchEscalas, token]
  );

  // Delete escala
  const handleDelete = useCallback(
    async (escala: Escala) => {
      if (!confirm(`Deseja deletar a escala "${escala.codigo}"?`)) {
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/escalas/${escala.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao deletar escala.');
          return;
        }

        setSuccess('Escala deletada com sucesso!');
        await fetchEscalas();
      } catch {
        setError('Erro ao conectar com o servidor.');
      }
    },
    [token, fetchEscalas]
  );

  return (
    <div className="escala-management">
      <h1 className="escala-management__title">Cadastro de Escalas</h1>

      {error && (
        <div className="escala-management__error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="escala-management__success" role="status">
          {success}
        </div>
      )}

      <div className="escala-management__actions">
        <button
          type="button"
          className="escala-management__btn escala-management__btn--primary"
          onClick={handleNew}
        >
          Nova Escala
        </button>
      </div>

      <div className="escala-management__table-container">
        <table className="escala-management__table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Período</th>
              <th>Plantonista</th>
              <th>Área</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {escalas.length === 0 ? (
              <tr>
                <td colSpan={5} className="escala-management__empty">
                  {loading ? 'Carregando...' : 'Nenhuma escala cadastrada.'}
                </td>
              </tr>
            ) : (
              escalas.map((escala) => (
                <tr key={escala.id}>
                  <td>{escala.codigo}</td>
                  <td>{getPeriodoDisplay(escala.periodoCodigo)}</td>
                  <td>{getPlantonistaNome(escala.usuarioCodigo)}</td>
                  <td>{getAreaNome(escala.areaCodigo)}</td>
                  <td>
                    <button
                      type="button"
                      className="escala-management__btn escala-management__btn--edit"
                      onClick={() => handleEdit(escala)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="escala-management__btn escala-management__btn--delete"
                      onClick={() => handleDelete(escala)}
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="escala-management__form-overlay">
          <div className="escala-management__form-card">
            <h2 className="escala-management__form-title">
              {editingEscala ? 'Editar Escala' : 'Nova Escala'}
            </h2>
            <form className="escala-management__form" onSubmit={handleSave}>

              <div className="escala-management__field">
                <label className="escala-management__label">Area</label>
                <select className="escala-management__select" value={formAreaCodigo} onChange={(e) => { setFormAreaCodigo(e.target.value); setFormUsuarioCodigo(''); setFormPeriodoCodigo(''); setFormEntradas([]); }} required>
                  <option value="">Selecione uma área</option>
                  {areas.map((area) => (<option key={area.id} value={area.codigo}>{area.nome}</option>))}
                </select>
              </div>

              <div className="escala-management__field">
                <label className="escala-management__label">Plantonista</label>
                <select className="escala-management__select" value={formUsuarioCodigo} onChange={(e) => setFormUsuarioCodigo(e.target.value)} required disabled={!formAreaCodigo}>
                  <option value="">Selecione o plantonista</option>
                  {filteredPlantonistas.map((p) => (<option key={p.id} value={p.codigo}>{p.nome}</option>))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="escala-management__field">
                  <label className="escala-management__label">Mês</label>
                  <select className="escala-management__select" value={formMes} onChange={(e) => setFormMes(e.target.value)}>
                    <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option>
                    <option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option>
                    <option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option>
                    <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                  </select>
                </div>
                <div className="escala-management__field">
                  <label className="escala-management__label">Ano</label>
                  <select className="escala-management__select" value={formAno} onChange={(e) => setFormAno(e.target.value)}>
                    <option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                  </select>
                </div>
              </div>

              {/* Grid: Horário + Data (adicionar múltiplos) */}
              <div className="escala-management__field">
                <label className="escala-management__label">Horários e Datas</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <select className="escala-management__select" value={formHorario} onChange={(e) => setFormHorario(e.target.value)} style={{ flex: '1 1 auto', minWidth: '150px' }}>
                    <option value="">Selecione o horário</option>
                    {periodos.length > 0
                      ? [...new Set(periodos.map(p => p.horarios))].map((h, i) => (<option key={i} value={h}>{h}</option>))
                      : <option value="24hs">24hs</option>
                    }
                  </select>
                  <select className="escala-management__select" value={formDia} onChange={(e) => setFormDia(e.target.value)} style={{ flex: '1 1 auto', minWidth: '120px' }}>
                    <option value="">Dia</option>
                    {Array.from({ length: new Date(Number(formAno), Number(formMes), 0).getDate() }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${formAno}-${formMes.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const weekday = new Date(Number(formAno), Number(formMes) - 1, day).toLocaleDateString('pt-BR', { weekday: 'short' });
                      return (<option key={day} value={dateStr}>{String(day).padStart(2, '0')} - {weekday}</option>);
                    })}
                  </select>
                  <button type="button" className="escala-management__btn escala-management__btn--primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
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
                      <div key={item.data} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 500 }}>🕐 {item.horario}</span>
                        <span style={{ fontSize: '0.85rem', color: '#e4e4e7', margin: '0 0.5rem' }}>|</span>
                        <span style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>📅 {item.data}</span>
                        <button type="button" onClick={() => setFormEntradas(formEntradas.filter(x => x.data !== item.data))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: 0, marginLeft: '0.5rem' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (<div className="escala-management__error" role="alert">{error}</div>)}

              <div className="escala-management__form-actions">
                <button type="button" className="escala-management__btn escala-management__btn--cancel" onClick={handleCancel}>Cancelar</button>
                <button type="submit" className="escala-management__btn escala-management__btn--primary" disabled={formLoading || !formAreaCodigo || !formUsuarioCodigo || formEntradas.length === 0}>
                  {formLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EscalaManagement;
