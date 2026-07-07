import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './ProblemaManagement.css';

import type { Area } from '../../shared/types';

interface ProblemaArea {
  areaCodigo: string;
  ordem: number;
}

interface Problema {
  id: number;
  codigo: string;
  descricao: string;
  areas: ProblemaArea[];
}

/**
 * ProblemaManagement — Cadastro de Problemas com grid de áreas responsáveis.
 *
 * Cada problema tem um código, descrição e uma lista ordenada de áreas responsáveis.
 * A ordem define a prioridade de acionamento (1ª, 2ª, 3ª área).
 */
export function ProblemaManagement(): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const user = useCommandCenterStore((state) => state.user);

  const [problemas, setProblemas] = useState<Problema[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Problema | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formAreas, setFormAreas] = useState<ProblemaArea[]>([]);
  const [addAreaCodigo, setAddAreaCodigo] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  if (!user || (user.perfil !== 'Adm' && user.perfil !== 'Responsavel')) {
    return (
      <div className="problema-management">
        <div className="problema-management__error">Acesso restrito.</div>
      </div>
    );
  }

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchProblemas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/problemas', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setProblemas(data); }
    } catch { setError('Erro ao carregar problemas.'); }
    finally { setLoading(false); }
  }, [token]);

  const fetchAreas = useCallback(async () => {
    try {
      // Try authenticated first, fallback to public endpoint
      let res = await fetch('/api/areas', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        res = await fetch('/api/areas/public');
      }
      if (res.ok) { const data = await res.json(); setAreas(data.areas || data || []); }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { fetchProblemas(); fetchAreas(); }, [fetchProblemas, fetchAreas]);

  const getAreaNome = (codigo: string) => areas.find((a) => a.codigo === codigo)?.nome || codigo;

  // Form handlers
  const handleNew = useCallback(() => {
    setEditing(null); setFormCodigo(''); setFormDescricao(''); setFormAreas([]); setAddAreaCodigo('');
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  const handleEdit = useCallback((p: Problema) => {
    setEditing(p); setFormCodigo(p.codigo); setFormDescricao(p.descricao); setFormAreas([...p.areas]); setAddAreaCodigo('');
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  const handleCancel = useCallback(() => { setShowForm(false); setEditing(null); }, []);

  // Add area to grid
  const handleAddArea = useCallback(() => {
    if (!addAreaCodigo) return;
    if (formAreas.find((a) => a.areaCodigo === addAreaCodigo)) {
      setError('Área já adicionada.');
      return;
    }
    const nextOrdem = formAreas.length + 1;
    setFormAreas([...formAreas, { areaCodigo: addAreaCodigo, ordem: nextOrdem }]);
    setAddAreaCodigo('');
    setError(null);
  }, [addAreaCodigo, formAreas]);

  // Remove area from grid
  const handleRemoveArea = useCallback((areaCodigo: string) => {
    const filtered = formAreas.filter((a) => a.areaCodigo !== areaCodigo);
    // Re-order
    const reordered = filtered.map((a, i) => ({ ...a, ordem: i + 1 }));
    setFormAreas(reordered);
  }, [formAreas]);

  // Save
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!formCodigo.trim()) { setError('Código é obrigatório.'); return; }
    if (!formDescricao.trim()) { setError('Descrição é obrigatória.'); return; }

    setFormLoading(true);
    try {
      const body = { codigo: formCodigo.trim(), descricao: formDescricao.trim(), areas: formAreas };
      let res: Response;
      if (editing) {
        res = await fetch(`/api/problemas/${editing.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
      } else {
        res = await fetch('/api/problemas', { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      }
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erro ao salvar.'); return; }
      setSuccess(editing ? 'Problema atualizado!' : 'Problema criado!');
      setShowForm(false); setEditing(null); await fetchProblemas();
    } catch { setError('Erro de conexão.'); }
    finally { setFormLoading(false); }
  }, [formCodigo, formDescricao, formAreas, editing, authHeaders, fetchProblemas]);

  // Delete
  const handleDelete = useCallback(async (p: Problema) => {
    if (!confirm(`Deletar problema "${p.codigo}"?`)) return;
    try {
      const res = await fetch(`/api/problemas/${p.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setSuccess('Problema deletado!'); await fetchProblemas(); }
      else { setError('Erro ao deletar.'); }
    } catch { setError('Erro de conexão.'); }
  }, [token, fetchProblemas]);

  // Available areas for grid (not yet added)
  const availableAreas = areas.filter((a) => !formAreas.find((fa) => fa.areaCodigo === a.codigo));

  return (
    <div className="problema-management">
      <h1 className="problema-management__title">CAD Problemas</h1>

      {error && <div className="problema-management__error" role="alert">{error}</div>}
      {success && <div className="problema-management__success" role="status">{success}</div>}

      <div className="problema-management__actions">
        <button className="problema-management__btn problema-management__btn--primary" onClick={handleNew}>
          Novo Problema
        </button>
      </div>

      <div className="problema-management__table-container">
        <table className="problema-management__table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Áreas Responsáveis (Ordem)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {problemas.length === 0 ? (
              <tr><td colSpan={4} className="problema-management__empty">{loading ? 'Carregando...' : 'Nenhum problema cadastrado.'}</td></tr>
            ) : (
              problemas.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{p.descricao}</td>
                  <td>
                    <div className="problema-management__areas-badges">
                      {p.areas.sort((a, b) => a.ordem - b.ordem).map((a) => (
                        <span key={a.areaCodigo} className="problema-management__area-badge">
                          <span className="problema-management__area-badge-order">{a.ordem}º</span>
                          {getAreaNome(a.areaCodigo)}
                        </span>
                      ))}
                      {p.areas.length === 0 && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>⚠ Sem área</span>}
                    </div>
                  </td>
                  <td>
                    <button className="problema-management__btn problema-management__btn--edit problema-management__btn--small" onClick={() => handleEdit(p)}>Editar</button>
                    <button className="problema-management__btn problema-management__btn--delete problema-management__btn--small" onClick={() => handleDelete(p)}>Deletar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="problema-management__form-overlay">
          <div className="problema-management__form-card">
            <h2 className="problema-management__form-title">{editing ? 'Editar Problema' : 'Cadastro Problema'}</h2>
            <form onSubmit={handleSave}>
              <div className="problema-management__field">
                <label className="problema-management__label">Código *</label>
                <input className="problema-management__input" type="text" value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} placeholder="Ex: PROB-001" required />
              </div>

              <div className="problema-management__field">
                <label className="problema-management__label">Descrição *</label>
                <input className="problema-management__input" type="text" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder="Descrição do problema" required />
              </div>

              {/* Grid de Áreas */}
              <div className="problema-management__field">
                <label className="problema-management__label">Áreas Responsáveis (Ordem de Acionamento)</label>

                <div className="problema-management__grid">
                  <div className="problema-management__grid-header">
                    <span>Ordem</span>
                    <span>Área</span>
                    <span></span>
                  </div>
                  {formAreas.length === 0 && (
                    <div className="problema-management__grid-row" style={{ justifyContent: 'center', color: '#a1a1aa', fontSize: '0.85rem' }}>
                      Nenhuma área adicionada. Use (+) abaixo.
                    </div>
                  )}
                  {formAreas.map((a) => (
                    <div key={a.areaCodigo} className="problema-management__grid-row">
                      <span className="problema-management__grid-ordem">{a.ordem}º</span>
                      <span>{getAreaNome(a.areaCodigo)}</span>
                      <button type="button" className="problema-management__btn problema-management__btn--delete problema-management__btn--small" onClick={() => handleRemoveArea(a.areaCodigo)}>✕</button>
                    </div>
                  ))}
                </div>

                {/* Add area */}
                <div className="problema-management__grid-add">
                  <select className="problema-management__select" value={addAreaCodigo} onChange={(e) => setAddAreaCodigo(e.target.value)}>
                    <option value="">Selecione uma área</option>
                    {availableAreas.map((a) => (
                      <option key={a.id} value={a.codigo}>{a.nome}</option>
                    ))}
                  </select>
                  <button type="button" className="problema-management__btn problema-management__btn--primary problema-management__btn--small" onClick={handleAddArea} disabled={!addAreaCodigo}>
                    + Adicionar
                  </button>
                </div>
              </div>

              {error && <div className="problema-management__error">{error}</div>}

              <div className="problema-management__form-actions">
                <button type="button" className="problema-management__btn problema-management__btn--cancel" onClick={handleCancel}>Cancelar</button>
                <button type="submit" className="problema-management__btn problema-management__btn--primary" disabled={formLoading || !formCodigo || !formDescricao}>
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

export default ProblemaManagement;
