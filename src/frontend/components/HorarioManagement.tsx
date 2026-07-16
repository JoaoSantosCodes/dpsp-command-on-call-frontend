import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './HorarioManagement.css';

import type { Area } from '../../shared/types';

interface Horario {
  id: number;
  areaCodigo: string;
  areaNome: string;
  horaInicio: string;
  horaFim: string;
}

/** Generate time options in 15-min intervals (00:00 to 23:45) */
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

/**
 * HorarioManagement — Cadastro de Horários por Área.
 *
 * Layout:
 *   Área: [Select Box]
 *   Horário Inicial: [Select Box]   Horário Final: [Select Box]
 *   [Salvar]
 *
 * Lists all configured horários below the form.
 */
export function HorarioManagement(): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const token = useCommandCenterStore((state) => state.token);

  const [areas, setAreas] = useState<Area[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formAreaCodigo, setFormAreaCodigo] = useState('');
  const [formHoraInicio, setFormHoraInicio] = useState('');
  const [formHoraFim, setFormHoraFim] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Check access
  if (!user || (user.perfil !== 'Adm' && user.perfil !== 'Responsavel')) {
    return (
      <div className="horario-management">
        <div className="horario-management__error" role="alert">
          Acesso restrito. Apenas administradores e responsáveis podem gerenciar horários.
        </div>
      </div>
    );
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch areas
  const fetchAreas = useCallback(async () => {
    try {
      const response = await fetch('/api/areas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setAreas(data.areas || data || []);
    } catch { /* silent */ }
  }, [token]);

  // Fetch existing horários (periodos grouped as horarios)
  const fetchHorarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/periodos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao carregar horários');
      const data = await response.json();
      const periodos = data.periodos || data || [];

      // Map periodos to horario format — deduplicate by area + horário
      const mapped: Horario[] = periodos
        .filter((p: any) => p.horarios && (p.horarios.includes('às') || p.horarios.includes('-') || p.horarios === '24hs' || p.horarios === '24h'))
        .map((p: any) => {
          let inicio = '', fim = '';
          if (p.horarios === '24hs' || p.horarios === '24h') {
            inicio = '00:00'; fim = '23:59';
          } else if (p.horarios.includes('às')) {
            const parts = p.horarios.split('às').map((s: string) => s.trim());
            inicio = parts[0] || ''; fim = parts[1] || '';
          } else {
            const parts = p.horarios.split('-').map((s: string) => s.trim());
            inicio = parts[0] || ''; fim = parts[1] || '';
          }
          const areaNome = areas.find((a) => a.codigo === p.areaCodigo)?.nome || p.areaCodigo;
          return {
            id: p.id,
            areaCodigo: p.areaCodigo,
            areaNome,
            horaInicio: inicio,
            horaFim: fim,
          };
        });

      // Deduplicate: keep only unique combinations of area + horário
      const seen = new Set<string>();
      const unique = mapped.filter((h) => {
        const key = `${h.areaCodigo}|${h.horaInicio}|${h.horaFim}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setHorarios(unique);
    } catch {
      setError('Erro ao carregar horários.');
    } finally {
      setLoading(false);
    }
  }, [token, areas]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  useEffect(() => {
    if (areas.length > 0) {
      fetchHorarios();
    }
  }, [areas, fetchHorarios]);

  // Get area name
  const getAreaNome = useCallback(
    (codigo: string): string => {
      const area = areas.find((a) => a.codigo === codigo);
      return area ? area.nome : codigo;
    },
    [areas]
  );

  // Save horário
  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      if (!formAreaCodigo) {
        setError('Selecione uma área.');
        return;
      }
      if (!formHoraInicio) {
        setError('Selecione o horário inicial.');
        return;
      }
      if (!formHoraFim) {
        setError('Selecione o horário final.');
        return;
      }
      if (formHoraInicio === formHoraFim) {
        setError('Horário inicial e final não podem ser iguais.');
        return;
      }

      setFormLoading(true);

      try {
        // Create a periodo with the horarios as "HH:MM-HH:MM"
        const today = new Date().toISOString().split('T')[0];
        const body = {
          data: today,
          horarios: `${formHoraInicio}-${formHoraFim}`,
          areaCodigo: formAreaCodigo,
        };

        const response = await fetch('/api/periodos', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao salvar horário.');
          return;
        }

        setSuccess('Horário cadastrado com sucesso!');
        setFormAreaCodigo('');
        setFormHoraInicio('');
        setFormHoraFim('');
        await fetchHorarios();
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setFormLoading(false);
      }
    },
    [formAreaCodigo, formHoraInicio, formHoraFim, authHeaders, fetchHorarios]
  );

  // Delete horário
  const handleDelete = useCallback(
    async (horario: Horario) => {
      if (!confirm(`Deseja remover o horário ${horario.horaInicio}-${horario.horaFim} da área "${horario.areaNome}"?`)) {
        return;
      }
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/periodos/${horario.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setError('Erro ao remover horário.');
          return;
        }

        setSuccess('Horário removido com sucesso!');
        await fetchHorarios();
      } catch {
        setError('Erro ao conectar com o servidor.');
      }
    },
    [token, fetchHorarios]
  );

  // Search and selection
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Form Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Horario | null>(null);

  const handleNew = useCallback(() => {
    setEditing(null);
    setFormAreaCodigo('');
    setFormHoraInicio('');
    setFormHoraFim('');
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  const handleEdit = useCallback((h: Horario) => {
    setEditing(h);
    setFormAreaCodigo(h.areaCodigo);
    setFormHoraInicio(h.horaInicio);
    setFormHoraFim(h.horaFim);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditing(null);
  }, []);

  const filtered = horarios.filter(h => {
    if (!search) return true;
    const s = search.toLowerCase();
    return h.areaNome.toLowerCase().includes(s) || h.horaInicio.includes(s) || h.horaFim.includes(s);
  });

  return (
    <div className="horario-management">
      <h1 className="horario-management__title">Cadastro de Horários</h1>

      {error && <div className="horario-management__error" role="alert">{error}</div>}
      {success && <div className="horario-management__success" role="status">{success}</div>}

      <input
        style={{
          width: '100%', background: 'var(--surface-bg)', border: '1px solid var(--input-border)',
          color: 'var(--input-text)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem'
        }}
        placeholder="🔍 Buscar por área ou horário..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button className="horario-management__btn horario-management__btn--primary" onClick={handleNew}>
          Novo Horário
        </button>

        {selectedIds.size > 0 && (
          <button className="horario-management__btn horario-management__btn--delete" onClick={async () => {
            if (!confirm(`Deseja deletar ${selectedIds.size} horário(s)?`)) return;
            setError(null);
            try {
              for (const id of selectedIds) {
                await fetch(`/api/periodos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
              }
              setSuccess(`${selectedIds.size} horário(s) deletado(s).`);
              setSelectedIds(new Set());
              await fetchHorarios();
            } catch { setError('Erro ao deletar.'); }
          }}>
            🗑️ Deletar ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="horario-management__table-container" style={{ border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
        <table className="horario-management__table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ background: 'var(--surface-bg)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', width: '40px' }}>
                <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={(e) => {
                  if (e.target.checked) setSelectedIds(new Set(filtered.map(p => p.id)));
                  else setSelectedIds(new Set());
                }} />
              </th>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}>Área</th>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}>Horários</th>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="horario-management__empty" style={{ textAlign: 'center', padding: '2rem' }}>{loading ? 'Carregando...' : 'Nenhum horário cadastrado.'}</td></tr>
            ) : (
              filtered.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--row-border)', background: selectedIds.has(h.id) ? 'rgba(99,102,241,0.08)' : undefined }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <input type="checkbox" checked={selectedIds.has(h.id)} onChange={(e) => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(h.id); else next.delete(h.id);
                      setSelectedIds(next);
                    }} />
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{h.areaNome}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <span className="horario-management__time-badge" style={{ background: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      🕐 {h.horaInicio} → {h.horaFim}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button style={{ background: 'var(--btn-edit-bg)', border: '1px solid var(--btn-edit-border)', color: 'var(--btn-edit-text)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => handleEdit(h)}>Editar</button>
                      <button style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => handleDelete(h)}>Deletar</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--page-text)', marginBottom: '1rem' }}>{editing ? 'Editar Horário' : 'Novo Horário'}</h2>
            
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--page-text-muted)', marginBottom: '0.4rem' }}>Área</label>
                <select style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem', borderRadius: '6px' }} value={formAreaCodigo} onChange={e => setFormAreaCodigo(e.target.value)} required>
                  <option value="">Selecione uma área</option>
                  {areas.map(a => <option key={a.id} value={a.codigo}>{a.nome}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--page-text-muted)', marginBottom: '0.4rem' }}>Inicial</label>
                  <select style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem', borderRadius: '6px' }} value={formHoraInicio} onChange={e => setFormHoraInicio(e.target.value)} required>
                    <option value="">Selecione</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--page-text-muted)', marginBottom: '0.4rem' }}>Final</label>
                  <select style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem', borderRadius: '6px' }} value={formHoraFim} onChange={e => setFormHoraFim(e.target.value)} required>
                    <option value="">Selecione</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={handleCancel} style={{ flex: 1, padding: '0.6rem', background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', color: 'var(--btn-cancel-text)', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={formLoading || !formAreaCodigo || !formHoraInicio || !formHoraFim} style={{ flex: 1, padding: '0.6rem', background: 'var(--btn-primary-bg)', border: 'none', color: 'var(--btn-primary-text)', borderRadius: '8px', cursor: 'pointer' }}>
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

export default HorarioManagement;
