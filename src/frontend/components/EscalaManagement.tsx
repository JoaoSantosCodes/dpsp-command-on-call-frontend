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
  const [formPeriodoCodigo, setFormPeriodoCodigo] = useState('');
  const [formUsuarioCodigo, setFormUsuarioCodigo] = useState('');
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
    setFormAreaCodigo('');
    setFormPeriodoCodigo('');
    setFormUsuarioCodigo('');
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  // Open form for editing
  const handleEdit = useCallback((escala: Escala) => {
    setEditingEscala(escala);
    setFormAreaCodigo(escala.areaCodigo);
    setFormPeriodoCodigo(escala.periodoCodigo);
    setFormUsuarioCodigo(escala.usuarioCodigo);
    setShowForm(true);
    setError(null);
    setSuccess(null);
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

      if (!formAreaCodigo) {
        setError('Área é obrigatória.');
        return;
      }
      if (!formPeriodoCodigo) {
        setError('Período é obrigatório.');
        return;
      }
      if (!formUsuarioCodigo) {
        setError('Plantonista é obrigatório.');
        return;
      }

      setFormLoading(true);

      try {
        const codigo = editingEscala
          ? editingEscala.codigo
          : `ESC-${Date.now()}`;

        const body = {
          codigo,
          areaCodigo: formAreaCodigo,
          periodoCodigo: formPeriodoCodigo,
          usuarioCodigo: formUsuarioCodigo,
        };

        let response: Response;

        if (editingEscala) {
          response = await fetch(`/api/escalas/${editingEscala.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
        } else {
          response = await fetch('/api/escalas', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao salvar escala.');
          return;
        }

        setSuccess(editingEscala ? 'Escala atualizada com sucesso!' : 'Escala criada com sucesso!');
        setShowForm(false);
        setEditingEscala(null);
        await fetchEscalas();
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setFormLoading(false);
      }
    },
    [formAreaCodigo, formPeriodoCodigo, formUsuarioCodigo, editingEscala, authHeaders, fetchEscalas]
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
                <label className="escala-management__label" htmlFor="escala-area">
                  Área *
                </label>
                <select
                  id="escala-area"
                  className="escala-management__select"
                  value={formAreaCodigo}
                  onChange={(e) => {
                    setFormAreaCodigo(e.target.value);
                    setFormPeriodoCodigo('');
                  }}
                  required
                >
                  <option value="">Selecione uma área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.codigo}>
                      {area.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="escala-management__field">
                <label className="escala-management__label" htmlFor="escala-periodo">
                  Período *
                </label>
                <select
                  id="escala-periodo"
                  className="escala-management__select"
                  value={formPeriodoCodigo}
                  onChange={(e) => setFormPeriodoCodigo(e.target.value)}
                  required
                  disabled={!formAreaCodigo}
                >
                  <option value="">Selecione um período</option>
                  {periodos.map((periodo) => (
                    <option key={periodo.id} value={periodo.codigo}>
                      {periodo.data} ({periodo.horarios})
                    </option>
                  ))}
                </select>
              </div>

              <div className="escala-management__field">
                <label className="escala-management__label" htmlFor="escala-plantonista">
                  Plantonista *
                </label>
                <select
                  id="escala-plantonista"
                  className="escala-management__select"
                  value={formUsuarioCodigo}
                  onChange={(e) => setFormUsuarioCodigo(e.target.value)}
                  required
                  disabled={!formAreaCodigo}
                >
                  <option value="">Selecione um plantonista</option>
                  {filteredPlantonistas.map((plantonista) => (
                    <option key={plantonista.id} value={plantonista.codigo}>
                      {plantonista.nome}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="escala-management__error" role="alert">
                  {error}
                </div>
              )}

              <div className="escala-management__form-actions">
                <button
                  type="button"
                  className="escala-management__btn escala-management__btn--cancel"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="escala-management__btn escala-management__btn--primary"
                  disabled={formLoading || !formAreaCodigo || !formPeriodoCodigo || !formUsuarioCodigo}
                >
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
