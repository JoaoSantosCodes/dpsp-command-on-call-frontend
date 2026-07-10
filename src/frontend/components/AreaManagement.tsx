import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import type { Area } from '../../shared/types';

/**
 * AreaManagement component — CRUD screen for managing Areas.
 * Only accessible by users with 'Adm' profile.
 * Layout padronizado + suporte tema claro/escuro via CSS variables.
 */
export function AreaManagement(): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const token = useCommandCenterStore((state) => state.token);

  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  if (!user || user.perfil !== 'Adm') {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--error-text)' }} role="alert">
          Acesso restrito. Apenas administradores podem gerenciar áreas.
        </div>
      </div>
    );
  }

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchAreas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/areas', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Erro ao carregar áreas.');
      const data = await response.json();
      setAreas(data.areas || data || []);
    } catch { setError('Erro ao carregar áreas.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  const handleNew = useCallback(() => {
    setEditingArea(null);
    setFormCodigo(''); setFormNome(''); setFormTorre('');
    setFormCoordenadorNome(''); setFormCoordenadorContato('');
    setFormGerenteNome(''); setFormGerenteContato('');
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  const handleEdit = useCallback((area: Area) => {
    setEditingArea(area);
    setFormCodigo(area.codigo); setFormNome(area.nome);
    setFormTorre(area.torre || '');
    setFormCoordenadorNome(area.coordenadorNome || '');
    setFormCoordenadorContato(area.coordenadorContato || '');
    setFormGerenteNome(area.gerenteNome || '');
    setFormGerenteContato(area.gerenteContato || '');
    setShowForm(true); setError(null); setSuccess(null);
  }, []);

  const handleCancel = useCallback(() => { setShowForm(false); setEditingArea(null); }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!formCodigo.trim()) { setError('Código é obrigatório.'); return; }
    if (!formNome.trim()) { setError('Nome é obrigatório.'); return; }

    setFormLoading(true);
    try {
      const body = { codigo: formCodigo.trim(), nome: formNome.trim(), torre: formTorre.trim() || null, coordenadorNome: formCoordenadorNome.trim() || null, coordenadorContato: formCoordenadorContato.trim() || null, gerenteNome: formGerenteNome.trim() || null, gerenteContato: formGerenteContato.trim() || null };
      let response: Response;
      if (editingArea) { response = await fetch(`/api/areas/${editingArea.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) }); }
      else { response = await fetch('/api/areas', { method: 'POST', headers: authHeaders, body: JSON.stringify(body) }); }
      if (!response.ok) { const data = await response.json(); setError(data.error || 'Erro ao salvar área.'); return; }
      setSuccess(editingArea ? 'Área atualizada com sucesso!' : 'Área criada com sucesso!');
      setShowForm(false); setEditingArea(null); await fetchAreas();
    } catch { setError('Erro ao conectar com o servidor.'); }
    finally { setFormLoading(false); }
  }, [formCodigo, formNome, formTorre, formCoordenadorNome, formCoordenadorContato, formGerenteNome, formGerenteContato, editingArea, authHeaders, fetchAreas]);

  const handleDelete = useCallback(async (area: Area) => {
    if (!confirm(`Deseja deletar a área "${area.nome}"?`)) return;
    setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/areas/${area.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json(); setError(data.error || 'Erro ao deletar área.'); return; }
      setSuccess('Área deletada com sucesso!'); await fetchAreas();
    } catch { setError('Erro ao conectar com o servidor.'); }
  }, [token, fetchAreas]);

  const filtered = areas.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.nome.toLowerCase().includes(s) || a.codigo.toLowerCase().includes(s) || (a.torre || '').toLowerCase().includes(s) || (a.coordenadorNome || '').toLowerCase().includes(s);
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--page-text)', marginBottom: '1rem' }}>Gestão de Áreas</h1>

      {error && <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{success}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input style={{ flex: 1, background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }} placeholder="🔍 Buscar por nome, código ou torre..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={handleNew} style={primaryActionBtnStyle}>+ Nova Área</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ background: 'var(--surface-bg)' }}>
            <tr>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Torre</th>
              <th style={thStyle}>Coordenador</th>
              <th style={thStyle}>Contato Coord.</th>
              <th style={thStyle}>Gerente</th>
              <th style={thStyle}>Contato Ger.</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--page-text-dim)' }}>{loading ? 'Carregando...' : 'Nenhuma área cadastrada.'}</td></tr>
            ) : filtered.map(area => (
              <tr key={area.id} style={{ borderBottom: '1px solid var(--row-border)' }}>
                <td style={tdStyle}>{area.nome}</td>
                <td style={tdStyle}><span style={{ background: 'var(--badge-indigo-bg)', color: 'var(--badge-indigo-text)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>{area.codigo}</span></td>
                <td style={tdStyle}>{area.torre || '—'}</td>
                <td style={tdStyle}>{area.coordenadorNome || '—'}</td>
                <td style={tdStyle}>{area.coordenadorContato || '—'}</td>
                <td style={tdStyle}>{area.gerenteNome || '—'}</td>
                <td style={tdStyle}>{area.gerenteContato || '—'}</td>
                <td style={tdStyle}><button onClick={() => handleEdit(area)} style={editBtnStyle}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={handleCancel}>
          <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--page-text)', marginBottom: '1rem' }}>{editingArea ? 'Editar Área' : 'Nova Área'}</h2>
            <form onSubmit={handleSave}>
              <Field label="Código *" value={formCodigo} onChange={setFormCodigo} placeholder="Ex: AREA-001" />
              <Field label="Nome *" value={formNome} onChange={setFormNome} placeholder="Nome da área" />
              <Field label="Torre" value={formTorre} onChange={setFormTorre} placeholder="Torre (opcional)" />

              <hr style={{ border: 'none', borderTop: '1px solid var(--input-border)', margin: '1rem 0' }} />
              <h3 style={{ fontSize: '0.8rem', color: 'var(--page-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Coordenador</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome" value={formCoordenadorNome} onChange={setFormCoordenadorNome} placeholder="Nome" />
                <Field label="Contato" value={formCoordenadorContato} onChange={setFormCoordenadorContato} placeholder="Telefone" />
              </div>

              <h3 style={{ fontSize: '0.8rem', color: 'var(--page-text-muted)', margin: '1rem 0 0.75rem', textTransform: 'uppercase' }}>Gerente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome" value={formGerenteNome} onChange={setFormGerenteNome} placeholder="Nome" />
                <Field label="Contato" value={formGerenteContato} onChange={setFormGerenteContato} placeholder="Telefone" />
              </div>

              {error && <div style={{ color: 'var(--error-text)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={handleCancel} style={cancelBtnStyle}>Cancelar</button>
                <button type="submit" disabled={formLoading || !formCodigo || !formNome} style={{ ...primaryBtnStyle, opacity: formLoading ? 0.5 : 1 }}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (<div style={fieldStyle}><label style={labelStyle}>{label}</label><input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>);
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

export default AreaManagement;
