import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './TeamManagement.css';

interface Team {
  teamId: string;
  teamName: string;
  displayOrder: number;
}

export function TeamManagement(): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const token = useCommandCenterStore((state) => state.token);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formOrder, setFormOrder] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  if (!user || user.perfil !== 'Adm') {
    return (
      <div className="team-management">
        <div className="team-management__denied">
          Acesso restrito a administradores.
        </div>
      </div>
    );
  }

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTeams(data);
    } catch {
      setError('Erro ao carregar times.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleNew = useCallback(() => {
    setEditingTeam(null);
    setFormId('');
    setFormName('');
    setFormOrder(String(teams.length + 1));
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, [teams.length]);

  const handleEdit = useCallback((team: Team) => {
    setEditingTeam(team);
    setFormId(team.teamId);
    setFormName(team.teamName);
    setFormOrder(String(team.displayOrder));
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingTeam(null);
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formId.trim() || !formName.trim()) {
      setError('ID e Nome são obrigatórios.');
      return;
    }

    setFormLoading(true);
    try {
      let res: Response;
      if (editingTeam) {
        res = await fetch(`/api/teams/${editingTeam.teamId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: formName.trim(), displayOrder: parseInt(formOrder) || 99 }),
        });
      } else {
        res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: formId.trim(), name: formName.trim(), displayOrder: parseInt(formOrder) || 99 }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar time.');
        return;
      }

      setSuccess(editingTeam ? 'Time atualizado!' : 'Time criado!');
      setShowForm(false);
      await fetchTeams();
    } catch {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setFormLoading(false);
    }
  }, [formId, formName, formOrder, editingTeam, token, fetchTeams]);

  const handleDelete = useCallback(async (team: Team) => {
    if (!confirm(`Deseja deletar o time "${team.teamName}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/teams/${team.teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao deletar.');
        return;
      }
      setSuccess('Time deletado!');
      await fetchTeams();
    } catch {
      setError('Erro ao conectar com o servidor.');
    }
  }, [token, fetchTeams]);

  return (
    <div className="team-management">
      <h1 className="team-management__title">Gerenciar Times</h1>

      {error && <div className="team-management__error" role="alert">{error}</div>}
      {success && <div className="team-management__success" role="status">{success}</div>}

      <div className="team-management__actions">
        <button className="team-management__btn team-management__btn--primary" onClick={handleNew}>
          Novo Time
        </button>
      </div>

      <div className="team-management__table-container">
        <table className="team-management__table">
          <thead>
            <tr><th>ID</th><th>Nome</th><th>Ordem</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr><td colSpan={4} className="team-management__empty">{loading ? 'Carregando...' : 'Nenhum time cadastrado.'}</td></tr>
            ) : (
              teams.map((team) => (
                <tr key={team.teamId}>
                  <td>{team.teamId}</td>
                  <td>{team.teamName}</td>
                  <td>{team.displayOrder}</td>
                  <td>
                    <button className="team-management__btn team-management__btn--edit" onClick={() => handleEdit(team)}>Editar</button>
                    <button className="team-management__btn team-management__btn--delete" onClick={() => handleDelete(team)}>Deletar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="team-management__form-overlay">
          <div className="team-management__form-card">
            <h2>{editingTeam ? 'Editar Time' : 'Novo Time'}</h2>
            <form className="team-management__form" onSubmit={handleSave}>
              <div className="team-management__field">
                <label htmlFor="team-id">ID *</label>
                <input id="team-id" className="team-management__input" value={formId} onChange={(e) => setFormId(e.target.value)} placeholder="ex: time-pdv" disabled={!!editingTeam} required />
              </div>
              <div className="team-management__field">
                <label htmlFor="team-name">Nome *</label>
                <input id="team-name" className="team-management__input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do time" required />
              </div>
              <div className="team-management__field">
                <label htmlFor="team-order">Ordem</label>
                <input id="team-order" className="team-management__input" type="number" value={formOrder} onChange={(e) => setFormOrder(e.target.value)} placeholder="1" />
              </div>
              <div className="team-management__form-actions">
                <button type="button" className="team-management__btn team-management__btn--cancel" onClick={handleCancel}>Cancelar</button>
                <button type="submit" className="team-management__btn team-management__btn--primary" disabled={formLoading}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamManagement;
