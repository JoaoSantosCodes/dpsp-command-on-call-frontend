import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './PlantonistManagement.css';

import type { Area, Periodo } from '../../shared/types';

interface PlantonistUser {
  id: number;
  codigo: string;
  areaCodigo: string | null;
  nome: string;
  perfil: string;
  cargo: string | null;
  contato: string | null;
  username: string;
}

interface AreaHorario {
  id: number;
  horarios: string;
  data: string;
}

/**
 * PlantonistManagement component — CRUD screen for managing Plantonistas.
 * Accessible by users with 'Adm' or 'Responsavel' profile.
 * Provides listing, creation, editing, and deletion of plantonistas.
 * Filters users to only show those with perfil = "Plantonista".
 *
 * Validates: Requisito Documento — Cadastro de Plantonistas
 */
export function PlantonistManagement(): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const token = useCommandCenterStore((state) => state.token);
  const selectedAreas = useCommandCenterStore((state) => state.selectedAreas);

  const [plantonistas, setPlantonistas] = useState<PlantonistUser[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPlantonist, setEditingPlantonist] = useState<PlantonistUser | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formAreaCodigo, setFormAreaCodigo] = useState('');
  const [formHorario, setFormHorario] = useState('');
  const [formHorarioDatas, setFormHorarioDatas] = useState<Array<{data: string; horario: string}>>([]);
  const [formSobreaviso, setFormSobreaviso] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Area horarios state (fetched when area is selected in form)
  const [areaHorarios, setAreaHorarios] = useState<AreaHorario[]>([]);
  const [horariosLoading, setHorariosLoading] = useState(false);

  // Check access: Adm or Responsavel
  if (!user || (user.perfil !== 'Adm' && user.perfil !== 'Responsavel')) {
    return (
      <div className="plantonist-management">
        <div className="plantonist-management__denied" role="alert">
          Acesso restrito. Apenas administradores e responsáveis podem gerenciar plantonistas.
        </div>
      </div>
    );
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch plantonistas (users with perfil = Plantonista)
  const fetchPlantonistas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar plantonistas.');
      }
      const data = await response.json();
      const allUsers: PlantonistUser[] = data.users || data || [];
      // Filter to only Plantonistas
      let filtered = allUsers.filter((u) => u.perfil === 'Plantonista');
      // Filter by selected areas only for non-Adm users
      if (user?.perfil !== 'Adm' && selectedAreas.length > 0) {
        filtered = filtered.filter((u) => u.areaCodigo && selectedAreas.includes(u.areaCodigo));
      }
      setPlantonistas(filtered);
    } catch {
      setError('Erro ao carregar plantonistas.');
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

  useEffect(() => {
    fetchPlantonistas();
    fetchAreas();
  }, [fetchPlantonistas, fetchAreas]);

  // Fetch horários when area changes in the form
  useEffect(() => {
    if (!formAreaCodigo || !showForm) {
      setAreaHorarios([]);
      return;
    }

    // Reset horário selection when area changes
    setFormHorario('');

    async function fetchAreaHorarios() {
      setHorariosLoading(true);
      try {
        const response = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(formAreaCodigo)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const periodos = (data.periodos || data || []) as Periodo[];
          // Extract unique horarios for this area
          const horarios: AreaHorario[] = periodos.map((p) => ({
            id: p.id,
            horarios: p.horarios,
            data: p.data,
          }));
          setAreaHorarios(horarios);
        }
      } catch { /* silent */ }
      finally { setHorariosLoading(false); }
    }

    fetchAreaHorarios();
  }, [formAreaCodigo, showForm, token]);

  // Get area name by codigo
  const getAreaNome = useCallback(
    (areaCodigo: string | null): string => {
      if (!areaCodigo) return '—';
      const area = areas.find((a) => a.codigo === areaCodigo);
      return area ? area.nome : areaCodigo;
    },
    [areas]
  );

  // Open form for new plantonist
  const handleNew = useCallback(() => {
    setEditingPlantonist(null);
    setFormNome(''); setFormUsername(''); setFormSenha('');
    setFormAreaCodigo(''); setFormHorario('');
    setFormHorarioDatas([]); setFormSobreaviso([]);
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  // Open form for editing
  const handleEdit = useCallback((plantonist: PlantonistUser) => {
    setEditingPlantonist(plantonist);
    setFormNome(plantonist.nome); setFormUsername(plantonist.username); setFormSenha('');
    setFormAreaCodigo(plantonist.areaCodigo || '');
    setFormHorario(''); setFormHorarioDatas([]); setFormSobreaviso([]);
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  // Close form
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingPlantonist(null);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      if (!formUsername.trim()) {
        setError('Selecione um plantonista.');
        return;
      }
      if (!formAreaCodigo) {
        setError('Área vinculada é obrigatória.');
        return;
      }

      setFormLoading(true);

      try {
        let response: Response;

        // Plantonista já existe — apenas atualizar vínculo se necessário
        const selected = plantonistas.find(p => p.username === formUsername);
        if (selected) {
          response = await fetch(`/api/users/${selected.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ areaCodigo: formAreaCodigo }),
          });
        } else {
          setError('Plantonista não encontrado.');
          setFormLoading(false);
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao salvar plantonista.');
          return;
        }

        setSuccess(editingPlantonist ? 'Plantonista atualizado com sucesso!' : 'Plantonista criado com sucesso!');
        setShowForm(false);
        setEditingPlantonist(null);
        await fetchPlantonistas();
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setFormLoading(false);
      }
    },
    [formNome, formUsername, formSenha, formAreaCodigo, editingPlantonist, authHeaders, fetchPlantonistas]
  );

  // Delete plantonist
  const handleDelete = useCallback(
    async (plantonist: PlantonistUser) => {
      if (!confirm(`Deseja deletar o plantonista "${plantonist.nome}"?`)) {
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/users/${plantonist.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao deletar plantonista.');
          return;
        }

        setSuccess('Plantonista deletado com sucesso!');
        await fetchPlantonistas();
      } catch {
        setError('Erro ao conectar com o servidor.');
      }
    },
    [token, fetchPlantonistas]
  );

  return (
    <div className="plantonist-management">
      <h1 className="plantonist-management__title">Cadastro de Plantonistas</h1>

      {error && (
        <div className="plantonist-management__error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="plantonist-management__success" role="status">
          {success}
        </div>
      )}

      <div className="plantonist-management__actions">
        <button
          type="button"
          className="plantonist-management__btn plantonist-management__btn--primary"
          onClick={handleNew}
        >
          Novo Plantonista
        </button>
      </div>

      <div className="plantonist-management__table-container">
        <table className="plantonist-management__table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cargo</th>
              <th>Horário</th>
              <th>Sobreaviso</th>
              <th>Escalation</th>
              <th>Área</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {plantonistas.length === 0 ? (
              <tr>
                <td colSpan={7} className="plantonist-management__empty">
                  {loading ? 'Carregando...' : 'Nenhum plantonista cadastrado.'}
                </td>
              </tr>
            ) : (
              plantonistas.map((plantonist) => {
                // Parse cargo to extract horario if present
                const cargoRaw = plantonist.cargo || '';
                const horarioMatch = cargoRaw.match(/\(([^)]+)\)$/);
                const horario = horarioMatch ? horarioMatch[1] : '—';
                const cargoClean = horarioMatch ? cargoRaw.replace(horarioMatch[0], '').trim() : cargoRaw;

                // Get escalation chain from the area
                const area = areas.find((a) => a.codigo === plantonist.areaCodigo);

                return (
                  <tr key={plantonist.id}>
                    <td>{plantonist.nome}</td>
                    <td>{cargoClean || '—'}</td>
                    <td><span style={{ color: '#818cf8', fontSize: '0.85rem' }}>🕐 {horario}</span></td>
                    <td><span style={{ color: '#22c55e', fontSize: '0.85rem' }}>{plantonist.contato ? `📅 ${plantonist.contato}` : '—'}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem' }}>
                        <span>1º 📞 {plantonist.nome}</span>
                        <span style={{ color: '#f59e0b' }}>2º 📞 {area?.coordenadorNome || '⚠ Sem coordenador'}</span>
                        <span style={{ color: '#ef4444' }}>3º 📞 {area?.gerenteNome || '⚠ Sem gerente'}</span>
                      </div>
                    </td>
                    <td>{getAreaNome(plantonist.areaCodigo)}</td>
                    <td>
                      <button
                        type="button"
                        className="plantonist-management__btn plantonist-management__btn--edit"
                        onClick={() => handleEdit(plantonist)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="plantonist-management__btn plantonist-management__btn--delete"
                        onClick={() => handleDelete(plantonist)}
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="plantonist-management__form-overlay">
          <div className="plantonist-management__form-card">
            <h2 className="plantonist-management__form-title">
              {editingPlantonist ? 'Editar Plantonista' : 'Novo Plantonista'}
            </h2>
            <form className="plantonist-management__form" onSubmit={handleSave}>

              <div className="plantonist-management__field">
                <label className="plantonist-management__label">Área vinculada *</label>
                <select className="plantonist-management__select" value={formAreaCodigo} onChange={(e) => { setFormAreaCodigo(e.target.value); setFormUsername(''); setFormNome(''); }} required>
                  <option value="">Selecione uma área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.codigo}>{area.nome}</option>
                  ))}
                </select>
              </div>

              {/* Select plantonista existente da área */}
              {formAreaCodigo && (
                <div className="plantonist-management__field">
                  <label className="plantonist-management__label">Plantonista *</label>
                  <select className="plantonist-management__select" value={formUsername} onChange={(e) => { setFormUsername(e.target.value); const p = plantonistas.find(x => x.username === e.target.value); if (p) setFormNome(p.nome); }} required>
                    <option value="">Selecione o plantonista</option>
                    {plantonistas.filter(p => p.areaCodigo === formAreaCodigo).map((p) => (
                      <option key={p.id} value={p.username}>{p.nome} — {p.cargo || 'Plantonista'}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info do plantonista selecionado: Nível + Cargo */}
              {formUsername && (() => {
                const selected = plantonistas.find(p => p.username === formUsername);
                return selected ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Nível de Escalonamento</div>
                      <div style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>{(selected as any).nivelEscalonamento || '1º Escalão'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cargo</div>
                      <div style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>{selected.cargo || '—'}</div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Responsável da Área (info block) */}
              {formAreaCodigo && (() => {
                const selectedArea = areas.find((a) => a.codigo === formAreaCodigo);
                return selectedArea ? (
                  <div style={{ background: 'rgba(99,102,241,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.3rem' }}>Responsável da área</div>
                    <div style={{ fontSize: '0.9rem', color: '#e4e4e7' }}>{selectedArea.coordenadorNome || '—'}</div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa' }}>
                      <span><strong>Torre:</strong> {selectedArea.torre || '—'}</span>
                      <span><strong>Área:</strong> {selectedArea.nome}</span>
                    </div>
                    {selectedArea.gerenteNome && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: '#a1a1aa' }}>
                        <strong>Gerente:</strong> {selectedArea.gerenteNome}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}

              {error && (<div className="plantonist-management__error" role="alert">{error}</div>)}

              <div className="plantonist-management__form-actions">
                <button type="button" className="plantonist-management__btn plantonist-management__btn--cancel" onClick={handleCancel}>Cancelar</button>
                <button type="submit" className="plantonist-management__btn plantonist-management__btn--primary" disabled={formLoading || !formNome || !formUsername || !formAreaCodigo}>
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

export default PlantonistManagement;
