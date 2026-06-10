import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './PeriodoManagement.css';

import type { Area, Periodo } from '../../shared/types';

/** Shows how many days in the current month still need periods */
function DaysCoverage({ periodos }: { periodos: Periodo[] }): React.ReactElement {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  // Count unique days that have periodos this month
  const coveredDays = new Set<number>();
  periodos.forEach((p) => {
    const d = new Date(p.data + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      coveredDays.add(d.getDate());
    }
  });

  const remainingDays = daysInMonth - coveredDays.size;
  const daysFromToday = daysInMonth - today + 1;
  const uncoveredFromToday = Math.max(0, daysFromToday - [...coveredDays].filter(d => d >= today).length);

  return (
    <div className="periodo-management__coverage">
      <div className="periodo-management__coverage-stats">
        <div className="periodo-management__coverage-item">
          <span className="periodo-management__coverage-number">{coveredDays.size}</span>
          <span className="periodo-management__coverage-label">Dias preenchidos</span>
        </div>
        <div className="periodo-management__coverage-item periodo-management__coverage-item--warn">
          <span className="periodo-management__coverage-number">{uncoveredFromToday}</span>
          <span className="periodo-management__coverage-label">Dias faltando (a partir de hoje)</span>
        </div>
        <div className="periodo-management__coverage-item">
          <span className="periodo-management__coverage-number">{daysInMonth}</span>
          <span className="periodo-management__coverage-label">Total de dias no mês</span>
        </div>
      </div>
    </div>
  );
}

/**
 * PeriodoManagement component — CRUD screen for managing Períodos.
 * Accessible by users with 'Adm' or 'Responsavel' profile.
 * Provides listing, creation, editing, and deletion of períodos.
 * Filters períodos by the user's selected areas.
 *
 * Validates: Requisito Documento — Cadastro de Período
 */
export function PeriodoManagement(): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const token = useCommandCenterStore((state) => state.token);
  const selectedAreas = useCommandCenterStore((state) => state.selectedAreas);

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPeriodo, setEditingPeriodo] = useState<Periodo | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formData, setFormData] = useState('');
  const [formHorarios, setFormHorarios] = useState('');
  const [formAreaCodigo, setFormAreaCodigo] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Check access: Adm or Responsavel
  if (!user || (user.perfil !== 'Adm' && user.perfil !== 'Responsavel')) {
    return (
      <div className="periodo-management">
        <div className="periodo-management__denied" role="alert">
          Acesso restrito. Apenas administradores e responsáveis podem gerenciar períodos.
        </div>
      </div>
    );
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch periodos filtered by selected areas
  const fetchPeriodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // If user has selected areas, fetch by each area
      let allPeriodos: Periodo[] = [];

      if (selectedAreas.length > 0) {
        const promises = selectedAreas.map(async (areaCodigo) => {
          const response = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(areaCodigo)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Erro ao carregar períodos.');
          const data = await response.json();
          return (data.periodos || data || []) as Periodo[];
        });
        const results = await Promise.all(promises);
        allPeriodos = results.flat();
      } else {
        const response = await fetch('/api/periodos', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Erro ao carregar períodos.');
        const data = await response.json();
        allPeriodos = data.periodos || data || [];
      }

      setPeriodos(allPeriodos);
    } catch {
      setError('Erro ao carregar períodos.');
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
    fetchPeriodos();
    fetchAreas();
  }, [fetchPeriodos, fetchAreas]);

  // Get area name by codigo
  const getAreaNome = useCallback(
    (areaCodigo: string | null): string => {
      if (!areaCodigo) return '—';
      const area = areas.find((a) => a.codigo === areaCodigo);
      return area ? area.nome : areaCodigo;
    },
    [areas]
  );

  // Open form for new periodo
  const handleNew = useCallback(() => {
    setEditingPeriodo(null);
    setFormCodigo('');
    setFormData('');
    setFormHorarios('');
    setFormAreaCodigo('');
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  // Open form for editing
  const handleEdit = useCallback((periodo: Periodo) => {
    setEditingPeriodo(periodo);
    setFormCodigo(periodo.codigo);
    setFormData(periodo.data);
    setFormHorarios(periodo.horarios);
    setFormAreaCodigo(periodo.areaCodigo);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }, []);

  // Close form
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingPeriodo(null);
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
      if (!formData.trim()) {
        setError('Data é obrigatória.');
        return;
      }
      if (!formHorarios.trim()) {
        setError('Horários é obrigatório.');
        return;
      }
      if (!formAreaCodigo) {
        setError('Área vinculada é obrigatória.');
        return;
      }

      // Validate that the periodo belongs to user's selected area
      if (selectedAreas.length > 0 && !selectedAreas.includes(formAreaCodigo)) {
        setError('O período deve pertencer a uma das áreas selecionadas.');
        return;
      }

      setFormLoading(true);

      try {
        const body = {
          codigo: formCodigo.trim(),
          data: formData.trim(),
          horarios: formHorarios.trim(),
          areaCodigo: formAreaCodigo,
        };

        let response: Response;

        if (editingPeriodo) {
          response = await fetch(`/api/periodos/${editingPeriodo.id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
        } else {
          response = await fetch('/api/periodos', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(body),
          });
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao salvar período.');
          return;
        }

        setSuccess(editingPeriodo ? 'Período atualizado com sucesso!' : 'Período criado com sucesso!');
        setShowForm(false);
        setEditingPeriodo(null);
        await fetchPeriodos();
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setFormLoading(false);
      }
    },
    [formCodigo, formData, formHorarios, formAreaCodigo, editingPeriodo, authHeaders, fetchPeriodos, selectedAreas]
  );

  // Delete periodo
  const handleDelete = useCallback(
    async (periodo: Periodo) => {
      if (!confirm(`Deseja deletar o período "${periodo.codigo}"?`)) {
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/periodos/${periodo.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Erro ao deletar período.');
          return;
        }

        setSuccess('Período deletado com sucesso!');
        await fetchPeriodos();
      } catch {
        setError('Erro ao conectar com o servidor.');
      }
    },
    [token, fetchPeriodos]
  );

  return (
    <div className="periodo-management">
      <h1 className="periodo-management__title">Cadastro de Períodos</h1>

      {/* Controle de dias faltantes */}
      <DaysCoverage periodos={periodos} />

      {error && (
        <div className="periodo-management__error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="periodo-management__success" role="status">
          {success}
        </div>
      )}

      <div className="periodo-management__actions">
        <button
          type="button"
          className="periodo-management__btn periodo-management__btn--primary"
          onClick={handleNew}
        >
          Novo Período
        </button>
      </div>

      <div className="periodo-management__table-container">
        <table className="periodo-management__table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Data</th>
              <th>Horários</th>
              <th>Área</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {periodos.length === 0 ? (
              <tr>
                <td colSpan={5} className="periodo-management__empty">
                  {loading ? 'Carregando...' : 'Nenhum período cadastrado.'}
                </td>
              </tr>
            ) : (
              periodos.map((periodo) => (
                <tr key={periodo.id}>
                  <td>{periodo.codigo}</td>
                  <td>{periodo.data}</td>
                  <td>{periodo.horarios}</td>
                  <td>{getAreaNome(periodo.areaCodigo)}</td>
                  <td>
                    <button
                      type="button"
                      className="periodo-management__btn periodo-management__btn--edit"
                      onClick={() => handleEdit(periodo)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="periodo-management__btn periodo-management__btn--delete"
                      onClick={() => handleDelete(periodo)}
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
        <div className="periodo-management__form-overlay">
          <div className="periodo-management__form-card">
            <h2 className="periodo-management__form-title">
              {editingPeriodo ? 'Editar Período' : 'Novo Período'}
            </h2>
            <form className="periodo-management__form" onSubmit={handleSave}>
              <div className="periodo-management__field">
                <label className="periodo-management__label" htmlFor="periodo-codigo">
                  Código *
                </label>
                <input
                  id="periodo-codigo"
                  className="periodo-management__input"
                  type="text"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  placeholder="Ex: PER-001"
                  required
                />
              </div>

              <div className="periodo-management__field">
                <label className="periodo-management__label" htmlFor="periodo-data">
                  Data *
                </label>
                <input
                  id="periodo-data"
                  className="periodo-management__input"
                  type="date"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  required
                />
              </div>

              <div className="periodo-management__field">
                <label className="periodo-management__label" htmlFor="periodo-horarios">
                  Horários *
                </label>
                <input
                  id="periodo-horarios"
                  className="periodo-management__input"
                  type="text"
                  value={formHorarios}
                  onChange={(e) => setFormHorarios(e.target.value)}
                  placeholder="Ex: 08:00-16:00"
                  required
                />
              </div>

              <div className="periodo-management__field">
                <label className="periodo-management__label" htmlFor="periodo-area">
                  Área vinculada *
                </label>
                <select
                  id="periodo-area"
                  className="periodo-management__select"
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
                <div className="periodo-management__error" role="alert">
                  {error}
                </div>
              )}

              <div className="periodo-management__form-actions">
                <button
                  type="button"
                  className="periodo-management__btn periodo-management__btn--cancel"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="periodo-management__btn periodo-management__btn--primary"
                  disabled={formLoading || !formCodigo || !formData || !formHorarios || !formAreaCodigo}
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

export default PeriodoManagement;
