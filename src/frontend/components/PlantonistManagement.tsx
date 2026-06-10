import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './PlantonistManagement.css';

import type { Area } from '../../shared/types';

interface PlantonistUser {
  id: number;
  codigo: string;
  areaCodigo: string | null;
  nome: string;
  perfil: string;
  cargo: string | null;
  username: string;
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
  const [formCargo, setFormCargo] = useState('');
  const [formAreaCodigo, setFormAreaCodigo] = useState('');
  const [formLoading, setFormLoading] = useState(false);

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
    setFormNome('');
    setFormUsername('');
    setFormSenha('');
    setFormCargo('');
    setFormAreaCodigo('');
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  // Open form for editing
  const handleEdit = useCallback((plantonist: PlantonistUser) => {
    setEditingPlantonist(plantonist);
    setFormNome(plantonist.nome);
    setFormUsername(plantonist.username);
    setFormSenha('');
    setFormCargo(plantonist.cargo || '');
    setFormAreaCodigo(plantonist.areaCodigo || '');
    setShowForm(true);
    setError(null);
    setSuccess(null);
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

      if (!formNome.trim()) {
        setError('Nome é obrigatório.');
        return;
      }
      if (!formUsername.trim()) {
        setError('Username é obrigatório.');
        return;
      }
      if (!editingPlantonist && !formSenha.trim()) {
        setError('Senha é obrigatória para novo plantonista.');
        return;
      }
      if (!formAreaCodigo) {
        setError('Área vinculada é obrigatória.');
        return;
      }

      setFormLoading(true);

      try {
        let response: Response;

        if (editingPlantonist) {
          // Update existing
          const body = {
            codigo: editingPlantonist.codigo,
            areaCodigo: formAreaCodigo,
            nome: formNome.trim(),
            perfil: 'Plantonista',
            cargo: formCargo.trim() || null,
            username: formUsername.trim(),
          };
          response = await fetch(`/api/users/${editingPlantonist.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
        } else {
          // Create new
          const body = {
            codigo: `PLAN-${Date.now()}`,
            areaCodigo: formAreaCodigo,
            nome: formNome.trim(),
            perfil: 'Plantonista',
            cargo: formCargo.trim() || null,
            username: formUsername.trim(),
            senha: formSenha.trim(),
          };
          response = await fetch('/api/users', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
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
    [formNome, formUsername, formSenha, formCargo, formAreaCodigo, editingPlantonist, authHeaders, fetchPlantonistas]
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
              <th>Área</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {plantonistas.length === 0 ? (
              <tr>
                <td colSpan={4} className="plantonist-management__empty">
                  {loading ? 'Carregando...' : 'Nenhum plantonista cadastrado.'}
                </td>
              </tr>
            ) : (
              plantonistas.map((plantonist) => (
                <tr key={plantonist.id}>
                  <td>{plantonist.nome}</td>
                  <td>{plantonist.cargo || '—'}</td>
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
              ))
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
                <label className="plantonist-management__label" htmlFor="plantonist-nome">
                  Nome *
                </label>
                <input
                  id="plantonist-nome"
                  className="plantonist-management__input"
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome do plantonista"
                  required
                />
              </div>

              <div className="plantonist-management__field">
                <label className="plantonist-management__label" htmlFor="plantonist-username">
                  Username *
                </label>
                <input
                  id="plantonist-username"
                  className="plantonist-management__input"
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Username para login"
                  required
                />
              </div>

              {!editingPlantonist && (
                <div className="plantonist-management__field">
                  <label className="plantonist-management__label" htmlFor="plantonist-senha">
                    Senha *
                  </label>
                  <input
                    id="plantonist-senha"
                    className="plantonist-management__input"
                    type="password"
                    value={formSenha}
                    onChange={(e) => setFormSenha(e.target.value)}
                    placeholder="Senha de acesso"
                    required
                  />
                </div>
              )}

              <div className="plantonist-management__field">
                <label className="plantonist-management__label" htmlFor="plantonist-cargo">
                  Cargo
                </label>
                <input
                  id="plantonist-cargo"
                  className="plantonist-management__input"
                  type="text"
                  value={formCargo}
                  onChange={(e) => setFormCargo(e.target.value)}
                  placeholder="Cargo (opcional)"
                />
              </div>

              <div className="plantonist-management__field">
                <label className="plantonist-management__label" htmlFor="plantonist-area">
                  Área vinculada *
                </label>
                <select
                  id="plantonist-area"
                  className="plantonist-management__select"
                  value={formAreaCodigo}
                  onChange={(e) => setFormAreaCodigo(e.target.value)}
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

              {error && (
                <div className="plantonist-management__error" role="alert">
                  {error}
                </div>
              )}

              <div className="plantonist-management__form-actions">
                <button
                  type="button"
                  className="plantonist-management__btn plantonist-management__btn--cancel"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="plantonist-management__btn plantonist-management__btn--primary"
                  disabled={formLoading || !formNome || !formUsername || !formAreaCodigo}
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

export default PlantonistManagement;
