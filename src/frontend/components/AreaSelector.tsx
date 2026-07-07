import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './AreaSelector.css';

import type { Area } from '../../shared/types';

/**
 * AreaSelector component — area selection screen shown after login.
 * For Adm users: displays all areas with multi-select checkboxes.
 * For Responsável/Plantonista users: displays only their linked area.
 * On confirm: calls POST /api/auth/select-area, stores selection in Zustand, navigates to dashboard.
 *
 * Validates: Requisito Documento — Após validar login, escolher áreas para visibilidade
 */
export function AreaSelector(): React.ReactElement {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useCommandCenterStore((state) => state.token);
  const user = useCommandCenterStore((state) => state.user);
  const setSelectedAreas = useCommandCenterStore((state) => state.setSelectedAreas);
  const setCurrentView = useCommandCenterStore((state) => state.setCurrentView);

  // Fetch available areas on mount
  useEffect(() => {
    async function fetchAreas() {
      try {
        const response = await fetch('/api/areas', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          setError('Erro ao carregar áreas.');
          return;
        }

        const data = await response.json();
        const allAreas: Area[] = data.areas || data || [];

        // Filter areas based on user profile
        if (user && user.perfil !== 'Adm' && user.areaCodigo) {
          const filtered = allAreas.filter((a) => a.codigo === user.areaCodigo);
          setAreas(filtered);
          // Auto-select their area
          setSelected([user.areaCodigo]);
        } else {
          setAreas(allAreas);
        }
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setLoading(false);
      }
    }
    fetchAreas();
  }, [token, user]);

  const toggleArea = useCallback((codigo: string) => {
    setSelected((prev) => {
      if (prev.includes(codigo)) {
        return prev.filter((c) => c !== codigo);
      }
      return [...prev, codigo];
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (selected.length === 0) {
      setError('Selecione pelo menos uma área.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Call select-area for each selected area (validates permission)
      // We send the first selected area to validate; for Adm users all are valid
      const response = await fetch('/api/auth/select-area', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ areaCodigo: selected[0] }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Erro ao confirmar seleção de área.');
        return;
      }

      // Store selected areas in Zustand and navigate to mapa
      setSelectedAreas(selected);
      setCurrentView('monitor-mapping');
    } catch {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setSubmitting(false);
    }
  }, [selected, token, setSelectedAreas, setCurrentView]);

  return (
    <div className="area-selector">
      <div className="area-selector__card">
        <h1 className="area-selector__title">Selecionar Área</h1>
        <p className="area-selector__subtitle">
          Escolha as áreas para visibilidade no mapa de plantonistas
        </p>

        {error && (
          <div className="area-selector__error" role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="area-selector__loading">Carregando áreas...</div>
        )}

        {!loading && areas.length === 0 && (
          <div className="area-selector__empty">
            Nenhuma área disponível.
          </div>
        )}

        {!loading && areas.length > 0 && (
          <div className="area-selector__list" role="group" aria-label="Áreas disponíveis">
            {areas.map((area) => (
              <label
                key={area.codigo}
                className={`area-selector__item ${selected.includes(area.codigo) ? 'area-selector__item--selected' : ''}`}
              >
                <input
                  type="checkbox"
                  className="area-selector__checkbox"
                  checked={selected.includes(area.codigo)}
                  onChange={() => toggleArea(area.codigo)}
                  aria-label={`Selecionar área ${area.nome}`}
                />
                <div className="area-selector__item-info">
                  <span className="area-selector__item-name">{area.nome}</span>
                  {area.torre && (
                    <span className="area-selector__item-torre">Torre: {area.torre}</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          type="button"
          className="area-selector__button"
          disabled={submitting || selected.length === 0}
          onClick={handleConfirm}
        >
          {submitting ? 'Confirmando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}

export default AreaSelector;
