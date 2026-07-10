import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
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
  nivelEscalonamento?: string | null;
}

/**
 * PlantonistManagement component — CRUD screen for managing Plantonistas.
 * Layout padronizado + suporte tema claro/escuro via CSS variables.
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
  const [search, setSearch] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPlantonist, setEditingPlantonist] = useState<PlantonistUser | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formAreaCodigo, setFormAreaCodigo] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  if (!user || (user.perfil !== 'Adm' && user.perfil !== 'Responsavel')) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--error-text)' }} role="alert">
          Acesso restrito. Apenas administradores e responsáveis podem gerenciar plantonistas.
        </div>
      </div>
    );
  }

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchPlantonistas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Erro ao carregar plantonistas.');
      const data = await response.json();
      const allUsers: PlantonistUser[] = data.users || data || [];
      let filtered = allUsers.filter((u) => u.perfil === 'Plantonista');
      if (user?.perfil !== 'Adm' && selectedAreas.length > 0) {
        filtered = filtered.filter((u) => u.areaCodigo && selectedAreas.includes(u.areaCodigo));
      }
      setPlantonistas(filtered);
    } catch { setError('Erro ao carregar plantonistas.'); }
    finally { setLoading(false); }
  }, [token, selectedAreas]);

  const fetchAreas = useCallback(async () => {
    try {
      const response = await fetch('/api/areas', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      setAreas(data.areas || data || []);
    } catch {}
  }, [token]);

  useEffect(() => { fetchPlantonistas(); fetchAreas(); }, [fetchPlantonistas, fetchAreas]);

  const getAreaNome = useCallback((areaCodigo: string | null): string => {
    if (!areaCodigo) return '—';
    const area = areas.find((a) => a.codigo === areaCodigo);
    return area ? area.nome : areaCodigo;
  }, [areas]);

  const handleNew = useCallback(() => {
    setEditingPlantonist(null);
    setFormNome(''); setFormUsername(''); setFormAreaCodigo('');
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  const handleEdit = useCallback((plantonist: PlantonistUser) => {
    setEditingPlantonist(plantonist);
    setFormNome(plantonist.nome); setFormUsername(plantonist.username);
    setFormAreaCodigo(plantonist.areaCodigo || '');
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  const handleCancel = useCallback(() => { setShowForm(false); setEditingPlantonist(null); }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!formUsername.trim()) { setError('Selecione um plantonista.'); return; }
    if (!formAreaCodigo) { setError('Área vinculada é obrigatória.'); return; }

    setFormLoading(true);
    try {
      const selected = plantonistas.find(p => p.username === formUsername);
      if (!selected) { setError('Plantonista não encontrado.'); setFormLoading(false); return; }

      const response = await fetch(`/api/users/${selected.id}`, {
        method: 'PUT', headers: authHeaders, body: JSON.stringify({ areaCodigo: formAreaCodigo }),
      });
      if (!response.ok) { const data = await response.json(); setError(data.error || 'Erro ao salvar plantonista.'); return; }

      setSuccess(editingPlantonist ? 'Plantonista atualizado!' : 'Plantonista criado!');
      setShowForm(false); setEditingPlantonist(null); await fetchPlantonistas();
    } catch { setError('Erro ao conectar com o servidor.'); }
    finally { setFormLoading(false); }
  }, [formUsername, formAreaCodigo, editingPlantonist, authHeaders, fetchPlantonistas, plantonistas]);

  const handleDelete = useCallback(async (plantonist: PlantonistUser) => {
    if (!confirm(`Deseja deletar o plantonista "${plantonist.nome}"?`)) return;
    setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/users/${plantonist.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json(); setError(data.error || 'Erro ao deletar plantonista.'); return; }
      setSuccess('Plantonista deletado com sucesso!'); await fetchPlantonistas();
    } catch { setError('Erro ao conectar com o servidor.'); }
  }, [token, fetchPlantonistas]);

  const filtered = plantonistas.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.nome.toLowerCase().includes(s) || (p.cargo || '').toLowerCase().includes(s) || getAreaNome(p.areaCodigo).toLowerCase().includes(s) || (p.contato || '').toLowerCase().includes(s);
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--page-text)', marginBottom: '1rem' }}>Gestão de Plantonistas</h1>

      {error && <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{success}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input style={{ flex: 1, background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }} placeholder="🔍 Buscar por nome, cargo ou área..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={handleNew} style={primaryActionBtnStyle}>+ Novo Plantonista</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ background: 'var(--surface-bg)' }}>
            <tr>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>Perfil</th>
              <th style={thStyle}>Cargo</th>
              <th style={thStyle}>Contato</th>
              <th style={thStyle}>Área</th>
              <th style={thStyle}>Escalation</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--page-text-dim)' }}>{loading ? 'Carregando...' : 'Nenhum plantonista cadastrado.'}</td></tr>
            ) : filtered.map(plantonist => {
              const area = areas.find(a => a.codigo === plantonist.areaCodigo);
              return (
                <tr key={plantonist.id} style={{ borderBottom: '1px solid var(--row-border)' }}>
                  <td style={tdStyle}>{plantonist.nome}</td>
                  <td style={tdStyle}><span style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>Plantonista</span></td>
                  <td style={tdStyle}>{plantonist.cargo || '—'}</td>
                  <td style={tdStyle}>{plantonist.contato || '—'}</td>
                  <td style={tdStyle}>{getAreaNome(plantonist.areaCodigo)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--badge-indigo-text)' }}>1º {plantonist.nome}</span>
                      <span style={{ color: 'var(--badge-yellow-text)' }}>2º {area?.coordenadorNome || '—'}</span>
                      <span style={{ color: 'var(--badge-red-text)' }}>3º {area?.gerenteNome || '—'}</span>
                    </div>
                  </td>
                  <td style={tdStyle}><button onClick={() => handleEdit(plantonist)} style={editBtnStyle}>Editar</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={handleCancel}>
          <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--page-text)', marginBottom: '1rem' }}>{editingPlantonist ? 'Editar Plantonista' : 'Novo Plantonista'}</h2>
            <form onSubmit={handleSave}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Área vinculada *</label>
                <select style={inputStyle} value={formAreaCodigo} onChange={(e) => { setFormAreaCodigo(e.target.value); setFormUsername(''); setFormNome(''); }} required>
                  <option value="">Selecione uma área</option>
                  {areas.map((area) => (<option key={area.id} value={area.codigo}>{area.nome}</option>))}
                </select>
              </div>

              {formAreaCodigo && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Plantonista *</label>
                  <select style={inputStyle} value={formUsername} onChange={(e) => { setFormUsername(e.target.value); const p = plantonistas.find(x => x.username === e.target.value); if (p) setFormNome(p.nome); }} required>
                    <option value="">Selecione o plantonista</option>
                    {plantonistas.filter(p => p.areaCodigo === formAreaCodigo).map((p) => (
                      <option key={p.id} value={p.username}>{p.nome} — {p.cargo || 'Plantonista'}</option>
                    ))}
                  </select>
                </div>
              )}

              {formUsername && (() => {
                const selected = plantonistas.find(p => p.username === formUsername);
                return selected ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ background: 'var(--surface-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--page-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Nível</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--page-text)' }}>{selected.nivelEscalonamento || '1º Escalão'}</div>
                    </div>
                    <div style={{ background: 'var(--surface-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--page-text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cargo</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--page-text)' }}>{selected.cargo || '—'}</div>
                    </div>
                  </div>
                ) : null;
              })()}

              {formAreaCodigo && (() => {
                const selectedArea = areas.find((a) => a.codigo === formAreaCodigo);
                return selectedArea ? (
                  <div style={{ background: 'var(--badge-indigo-bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--btn-edit-border)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--badge-indigo-text)', fontWeight: 600, marginBottom: '0.3rem' }}>Responsável da área</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--page-text)' }}>{selectedArea.coordenadorNome || '—'}</div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--page-text-muted)' }}>
                      <span><strong>Torre:</strong> {selectedArea.torre || '—'}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              {error && <div style={{ color: 'var(--error-text)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={handleCancel} style={cancelBtnStyle}>Cancelar</button>
                <button type="submit" disabled={formLoading || !formUsername || !formAreaCodigo} style={{ ...primaryBtnStyle, opacity: formLoading ? 0.5 : 1 }}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--th-color)', textTransform: 'uppercase', fontSize: '0.65rem', borderBottom: '1px solid var(--th-border)' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', color: 'var(--page-text)' };
const editBtnStyle: React.CSSProperties = { background: 'var(--btn-edit-bg)', border: '1px solid var(--btn-edit-border)', color: 'var(--btn-edit-text)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' };
const primaryActionBtnStyle: React.CSSProperties = { background: 'var(--btn-primary-bg)', border: 'none', color: 'var(--btn-primary-text)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' };
const cancelBtnStyle: React.CSSProperties = { flex: 1, padding: '0.6rem', background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', color: 'var(--btn-cancel-text)', borderRadius: '8px', cursor: 'pointer' };
const primaryBtnStyle: React.CSSProperties = { flex: 1, padding: '0.6rem', background: 'var(--btn-primary-bg)', border: 'none', color: 'var(--btn-primary-text)', borderRadius: '8px', cursor: 'pointer' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--page-text-muted)', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' };

export default PlantonistManagement;
