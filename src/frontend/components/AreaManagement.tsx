import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './AreaManagement.css';

import type { Area } from '../../shared/types';

/**
 * AreaManagement component — CRUD screen for managing Areas.
 * Only accessible by users with 'Adm' profile.
 * Provides listing, creation, editing, and deletion of areas.
 *
 * Validates: Requisito Documento — Cadastro de Área (Salvar, Editar, Deletar)
 */
export function AreaManagement(): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const token = useCommandCenterStore((state) => state.token);

  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formTorre, setFormTorre] = useState('');
  const [formCoordenadorNome, setFormCoordenadorNome] = useState('');
  const [formCoordenadorContato, setFormCoordenadorContato] = useState('');
  const [formGerenteNome, setFormGerenteNome] = useState('');
  const [formGerenteContato, setFormGerenteContato] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Check Adm access
  if (!user || user.perfil !== 'Adm') {
    return (
      <div className="area-management">
        <div className="area-management__denied" role="alert">
          Acesso restrito. Apenas administradores podem gerenciar áreas.
        </div>
      </div>
    );
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch areas list
  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/areas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar áreas.');
      }
      const data = await response.json();
      setAreas(data.areas || data || []);
    } catch {
      setError('Erro ao carregar áreas.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  // Open form for new area
  const handleNew = useCallback(() => {
    setEditingArea(null);
    setFormCodigo('');
    setFormNome('');
    setFormTorre('');
    setFormCoordenadorNome('');
    setFormCoordenadorContato('');
    setFormGerenteNome('');
    setFormGerenteContato('');
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  // Open form for editing
  const handleEdit = useCallback((area: Area) => {
    setEditingArea(area);
    setFormCodigo(area.codigo);
    setFormNome(area.nome);
    setFormTorre(area.torre || '');
    setFormCoordenadorNome(area.coordenadorNome || '');
    setFormCoordenadorContato(area.coordenadorContato || '');
    setFormGerenteNome(area.gerenteNome || '');
    setFormGerenteContato(area.gerenteContato || '');
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  // Close form
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingArea(null);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      if (!formCodigo.trim()) {
        setError('Código é obrigatório.');
        return;
      }
      if (!formNome.trim()) {
        setError('Nome é obrigatório.');
        return;
      }

      setFormLoading(true);

      try {
        const body = {
          codigo: formCodigo.trim(),
          nome: formNome.trim(),
          torre: formTorre.trim() || null,
          coordenadorNome: formCoordenadorNome.trim() || null,
          coordenadorContato: formCoordenadorContato.trim() || null,
          gerenteNome: formGerenteNome.trim() || null,
          gerenteContato: formGerenteContato.trim() || null,
        };

        let response: Response;

        if (editingArea) {
          // Update existing
          response = await fetch(`/api/areas/${editingArea.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
        } else {
          // Create new
          response = await fetch('/api/areas', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao salvar área.');
          return;
        }

        setSuccess(editingArea ? 'Área atualizada com sucesso!' : 'Área criada com sucesso!');
        setShowForm(false);
        setEditingArea(null);
        await fetchAreas();
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setFormLoading(false);
      }
    },
    [formCodigo, formNome, formTorre, editingArea, authHeaders, fetchAreas]
  );

  // Delete area
  const handleDelete = useCallback(
    async (area: Area) => {
      if (!confirm(`Deseja deletar a área "${area.nome}"?`)) {
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/areas/${area.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao deletar área.');
          return;
        }

        setSuccess('Área deletada com sucesso!');
        await fetchAreas();
      } catch {
        setError('Erro ao conectar com o servidor.');
      }
    },
    [token, fetchAreas]
  );

  return (
    <div className="area-management">
      <h1 className="area-management__title">Cadastro de Áreas</h1>

      {error && (
        <div className="area-management__error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="area-management__success" role="status">
          {success}
        </div>
      )}

      <div className="area-management__actions">
        <button
          type="button"
          className="area-management__btn area-management__btn--primary"
          onClick={handleNew}
        >
          Nova Área
        </button>
      </div>

      <div className="area-management__table-container">
        <table className="area-management__table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Torre</th>
              <th>Coordenador</th>
              <th>Gerente</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={6} className="area-management__empty">
                  {loading ? 'Carregando...' : 'Nenhuma área cadastrada.'}
                </td>
              </tr>
            ) : (
              areas.map((area) => (
                <tr key={area.id}>
                  <td>{area.codigo}</td>
                  <td>{area.nome}</td>
                  <td>{area.torre || '—'}</td>
                  <td>{area.coordenadorNome || '—'}</td>
                  <td>{area.gerenteNome || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="area-management__btn area-management__btn--edit"
                      onClick={() => handleEdit(area)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="area-management__btn area-management__btn--delete"
                      onClick={() => handleDelete(area)}
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
        <div className="area-management__form-overlay">
          <div className="area-management__form-card">
            <h2 className="area-management__form-title">
              {editingArea ? 'Editar Área' : 'Nova Área'}
            </h2>
            <form className="area-management__form" onSubmit={handleSave}>
              <div className="area-management__field">
                <label className="area-management__label" htmlFor="area-codigo">
                  Código *
                </label>
                <input
                  id="area-codigo"
                  className="area-management__input"
                  type="text"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  placeholder="Ex: AREA-001"
                  required
                />
              </div>

              <div className="area-management__field">
                <label className="area-management__label" htmlFor="area-nome">
                  Nome *
                </label>
                <input
                  id="area-nome"
                  className="area-management__input"
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome da área"
                  required
                />
              </div>

              <div className="area-management__field">
                <label className="area-management__label" htmlFor="area-torre">
                  Torre
                </label>
                <input
                  id="area-torre"
                  className="area-management__input"
                  type="text"
                  value={formTorre}
                  onChange={(e) => setFormTorre(e.target.value)}
                  placeholder="Torre (opcional)"
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }} />
              <h3 style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: '0.75rem' }}>Escalation — Coordenador</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="area-management__field">
                  <label className="area-management__label" htmlFor="area-coord-nome">
                    Nome do Coordenador
                  </label>
                  <input
                    id="area-coord-nome"
                    className="area-management__input"
                    type="text"
                    value={formCoordenadorNome}
                    onChange={(e) => setFormCoordenadorNome(e.target.value)}
                    placeholder="Nome"
                  />
                </div>
                <div className="area-management__field">
                  <label className="area-management__label" htmlFor="area-coord-contato">
                    Contato Coordenador
                  </label>
                  <input
                    id="area-coord-contato"
                    className="area-management__input"
                    type="text"
                    value={formCoordenadorContato}
                    onChange={(e) => setFormCoordenadorContato(e.target.value)}
                    placeholder="Telefone/WhatsApp"
                  />
                </div>
              </div>

              <h3 style={{ fontSize: '0.9rem', color: '#a1a1aa', margin: '1rem 0 0.75rem' }}>Escalation — Gerente</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="area-management__field">
                  <label className="area-management__label" htmlFor="area-gerente-nome">
                    Nome do Gerente
                  </label>
                  <input
                    id="area-gerente-nome"
                    className="area-management__input"
                    type="text"
                    value={formGerenteNome}
                    onChange={(e) => setFormGerenteNome(e.target.value)}
                    placeholder="Nome"
                  />
                </div>
                <div className="area-management__field">
                  <label className="area-management__label" htmlFor="area-gerente-contato">
                    Contato Gerente
                  </label>
                  <input
                    id="area-gerente-contato"
                    className="area-management__input"
                    type="text"
                    value={formGerenteContato}
                    onChange={(e) => setFormGerenteContato(e.target.value)}
                    placeholder="Telefone/WhatsApp"
                  />
                </div>
              </div>

              {error && (
                <div className="area-management__error" role="alert">
                  {error}
                </div>
              )}

              <div className="area-management__form-actions">
                <button
                  type="button"
                  className="area-management__btn area-management__btn--cancel"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="area-management__btn area-management__btn--primary"
                  disabled={formLoading || !formCodigo || !formNome}
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

export default AreaManagement;
