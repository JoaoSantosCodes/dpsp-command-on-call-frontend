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

      // Map periodos to horario format (extract horarios field as inicio-fim)
      const mapped: Horario[] = periodos
        .filter((p: any) => p.horarios && p.horarios.includes('-'))
        .map((p: any) => {
          const parts = p.horarios.split('-');
          const areaNome = areas.find((a) => a.codigo === p.areaCodigo)?.nome || p.areaCodigo;
          return {
            id: p.id,
            areaCodigo: p.areaCodigo,
            areaNome,
            horaInicio: parts[0]?.trim() || '',
            horaFim: parts[1]?.trim() || '',
          };
        });

      setHorarios(mapped);
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

  return (
    <div className="horario-management">
      <h1 className="horario-management__title">CAD Horários</h1>
      <p className="horario-management__subtitle">
        Cadastre os horários de plantão por área.
      </p>

      {error && (
        <div className="horario-management__error" role="alert">{error}</div>
      )}

      {success && (
        <div className="horario-management__success" role="status">{success}</div>
      )}

      {/* Form Card */}
      <div className="horario-management__form-card">
        <h2 className="horario-management__form-title">Novo Horário</h2>
        <form onSubmit={handleSave}>
          {/* Área */}
          <div className="horario-management__field" style={{ marginBottom: '1rem' }}>
            <label className="horario-management__label" htmlFor="horario-area">
              Área
            </label>
            <select
              id="horario-area"
              className="horario-management__select"
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

          {/* Horários: Inicial e Final */}
          <div className="horario-management__form-row">
            <div className="horario-management__field">
              <label className="horario-management__label" htmlFor="horario-inicio">
                Inicial
              </label>
              <select
                id="horario-inicio"
                className="horario-management__select"
                value={formHoraInicio}
                onChange={(e) => setFormHoraInicio(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="horario-management__field">
              <label className="horario-management__label" htmlFor="horario-fim">
                Final
              </label>
              <select
                id="horario-fim"
                className="horario-management__select"
                value={formHoraFim}
                onChange={(e) => setFormHoraFim(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="horario-management__field" style={{ justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="horario-management__btn horario-management__btn--primary"
                disabled={formLoading || !formAreaCodigo || !formHoraInicio || !formHoraFim}
              >
                {formLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table with existing horários */}
      <div className="horario-management__table-container">
        <table className="horario-management__table">
          <thead>
            <tr>
              <th>Área</th>
              <th>Horários</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {horarios.length === 0 ? (
              <tr>
                <td colSpan={3} className="horario-management__empty">
                  {loading ? 'Carregando...' : 'Nenhum horário cadastrado.'}
                </td>
              </tr>
            ) : (
              horarios.map((h) => (
                <tr key={h.id}>
                  <td>{h.areaNome}</td>
                  <td>
                    <span className="horario-management__time-badge">
                      🕐 {h.horaInicio} → {h.horaFim}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="horario-management__btn horario-management__btn--delete"
                      onClick={() => handleDelete(h)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HorarioManagement;
