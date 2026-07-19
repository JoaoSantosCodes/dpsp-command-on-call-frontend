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

  const [selectedTorre, setSelectedTorre] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [selectedAplicacao, setSelectedAplicacao] = useState('');

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
          setSelected([user.areaCodigo]);
        } else {
          setAreas(allAreas);
          if (allAreas.length > 0) {
            const firstTorre = allAreas[0].torre || 'Outras Torres';
            setSelectedTorre(firstTorre);
          }
        }
      } catch {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setLoading(false);
      }
    }
    fetchAreas();
  }, [token, user]);

  }, [token, user]);

  useEffect(() => {
    if (areas.length === 0 || !selectedTorre) return;
    const gruposDaTorre = Array.from(new Set(
      areas.filter(a => (a.torre || 'Outras Torres') === selectedTorre).map(a => a.grupo || 'Outras Áreas')
    ));
    if (gruposDaTorre.length > 0 && !gruposDaTorre.includes(selectedGrupo)) {
      setSelectedGrupo(gruposDaTorre[0]);
    }
  }, [selectedTorre, areas, selectedGrupo]);

  useEffect(() => {
    if (areas.length === 0 || !selectedTorre || !selectedGrupo) return;
    const areasDoGrupo = areas.filter(a => (a.torre || 'Outras Torres') === selectedTorre && (a.grupo || 'Outras Áreas') === selectedGrupo);
    if (areasDoGrupo.length > 0 && (!selectedAplicacao || !areasDoGrupo.find(a => a.codigo === selectedAplicacao))) {
      setSelectedAplicacao(areasDoGrupo[0].codigo);
    }
  }, [selectedTorre, selectedGrupo, areas, selectedAplicacao]);

  const toggleArea = useCallback((codigo: string) => {
    setSelected((prev) => {
      if (prev.includes(codigo)) {
        return prev.filter((c) => c !== codigo);
      }
      return [...prev, codigo];
    });
  }, []);

  const handleAddAplicacao = useCallback(() => {
    if (selectedAplicacao && !selected.includes(selectedAplicacao)) {
      setSelected(prev => [...prev, selectedAplicacao]);
    }
  }, [selectedAplicacao, selected]);

  const handleRemoveArea = useCallback((codigo: string) => {
    setSelected(prev => prev.filter(c => c !== codigo));
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
          <div className="area-selector__cascades" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {user?.perfil === 'Adm' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--page-text-muted)' }}>Torre</label>
                    <select 
                      value={selectedTorre} 
                      onChange={(e) => setSelectedTorre(e.target.value)} 
                      style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--surface-bg)', color: 'var(--page-text)' }}
                    >
                      {Array.from(new Set(areas.map(a => a.torre || 'Outras Torres'))).sort().map(torre => (
                        <option key={torre} value={torre}>🏢 {torre}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--page-text-muted)' }}>Área (Grupo)</label>
                    <select 
                      value={selectedGrupo} 
                      onChange={(e) => setSelectedGrupo(e.target.value)} 
                      style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--surface-bg)', color: 'var(--page-text)' }}
                      disabled={!selectedTorre}
                    >
                      {Array.from(new Set(areas.filter(a => (a.torre || 'Outras Torres') === selectedTorre).map(a => a.grupo || 'Outras Áreas'))).sort().map(grupo => (
                        <option key={grupo} value={grupo}>📁 {grupo}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--page-text-muted)' }}>Aplicação</label>
                    <select 
                      value={selectedAplicacao} 
                      onChange={(e) => setSelectedAplicacao(e.target.value)} 
                      style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--surface-bg)', color: 'var(--page-text)' }}
                      disabled={!selectedGrupo}
                    >
                      {areas.filter(a => (a.torre || 'Outras Torres') === selectedTorre && (a.grupo || 'Outras Áreas') === selectedGrupo).map(a => (
                        <option key={a.codigo} value={a.codigo}>⚙️ {a.nome}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={handleAddAplicacao}
                    type="button"
                    disabled={!selectedAplicacao || selected.includes(selectedAplicacao)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', cursor: 'pointer', height: '36px', fontWeight: 500 }}
                  >
                    Adicionar
                  </button>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--input-border)' }} />
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--page-text)' }}>Aplicações Selecionadas ({selected.length}):</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selected.length === 0 && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--page-text-muted)' }}>Nenhuma aplicação adicionada.</span>
                )}
                {selected.map(codigo => {
                  const area = areas.find(a => a.codigo === codigo);
                  if (!area) return null;
                  return (
                    <div key={codigo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--badge-indigo-bg)', color: 'var(--badge-indigo-text)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500 }}>
                      ⚙️ {area.nome}
                      {user?.perfil === 'Adm' && (
                        <button 
                          onClick={() => handleRemoveArea(codigo)}
                          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0', marginLeft: '4px', fontSize: '1rem', lineHeight: 1 }}
                          aria-label="Remover"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
