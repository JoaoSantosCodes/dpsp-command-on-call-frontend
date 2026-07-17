import React, { useState, useCallback, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import type { Area } from '../../shared/types';

interface UserItem {
  id: number; codigo: string; areaCodigo: string | null; nome: string;
  perfil: string; nivelEscalonamento: string | null; cargo: string | null;
  contato: string | null; username: string; ativo: boolean; aprovado: boolean;
}

export function UserManagement(): React.ReactElement {
  const token = useCommandCenterStore((s) => s.token);
  const user = useCommandCenterStore((s) => s.user);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Form
  const [fNome, setFNome] = useState('');
  const [fUsername, setFUsername] = useState('');
  const [fCargo, setFCargo] = useState('');
  const [fNivel, setFNivel] = useState('');
  const [fContato, setFContato] = useState('');
  const [fPerfil, setFPerfil] = useState('');
  const [fArea, setFArea] = useState('');
  const [fAtivo, setFAtivo] = useState(true);
  const [fSenha, setFSenha] = useState(''); // Added for new user creation
  const [saving, setSaving] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setUsers(d.users || d || []); }
    } catch {} finally { setLoading(false); }
  }, [token]);

  const fetchAreas = useCallback(async () => {
    try {
      const r = await fetch('/api/areas/public');
      if (r.ok) { const d = await r.json(); setAreas(d.areas || d || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); fetchAreas(); }, [fetchUsers, fetchAreas]);

  const openEdit = (u: UserItem | null) => {
    if (u) {
      setEditing(u); setFNome(u.nome); setFUsername(u.username);
      setFCargo(u.cargo || ''); setFNivel(u.nivelEscalonamento || '');
      setFContato(u.contato || ''); setFPerfil(u.perfil);
      setFArea(u.areaCodigo || ''); setFAtivo(u.ativo); setFSenha('');
    } else {
      setEditing({ id: 0, codigo: `USR-${Date.now()}`, areaCodigo: null, nome: '', perfil: 'Plantonista', nivelEscalonamento: null, cargo: null, contato: null, username: '', ativo: true, aprovado: true });
      setFNome(''); setFUsername(''); setFCargo(''); setFNivel(''); setFContato(''); setFPerfil('Plantonista'); setFArea(''); setFAtivo(true); setFSenha('');
    }
    setError(null); setSuccess(null);
  };

  const openClone = (u: UserItem) => {
    setEditing({ id: 0, codigo: `USR-${Date.now()}`, areaCodigo: u.areaCodigo, nome: `${u.nome} (Cópia)`, perfil: u.perfil, nivelEscalonamento: u.nivelEscalonamento, cargo: u.cargo, contato: u.contato, username: `${u.username}_copia`, ativo: u.ativo, aprovado: u.aprovado });
    setFNome(`${u.nome} (Cópia)`); setFUsername(`${u.username}_copia`); setFCargo(u.cargo || ''); setFNivel(u.nivelEscalonamento || ''); setFContato(u.contato || ''); setFPerfil(u.perfil); setFArea(u.areaCodigo || ''); setFAtivo(u.ativo); setFSenha('');
    setError(null); setSuccess(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true); setError(null);
    try {
      const isNew = editing.id === 0;
      const body: any = { nome: fNome, username: fUsername, cargo: fCargo || null, nivelEscalonamento: fNivel || null, contato: fContato || null, perfil: fPerfil, areaCodigo: fArea || null, ativo: fAtivo };
      
      if (isNew) {
        body.codigo = editing.codigo;
        body.senha = fSenha; // Require password for new user
      }

      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/users' : `/api/users/${editing.id}`;
      
      const r = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (r.ok) { setSuccess(isNew ? 'Usuário criado com sucesso!' : 'Usuário atualizado!'); setEditing(null); fetchUsers(); }
      else { const d = await r.json(); setError(d.error || 'Erro'); }
    } catch { setError('Erro de conexão'); } finally { setSaving(false); }
  };

  const filtered = users.filter(u => {
    if (search) {
      const s = search.toLowerCase();
      return u.nome.toLowerCase().includes(s) || u.perfil.toLowerCase().includes(s) || (u.cargo || '').toLowerCase().includes(s);
    }
    return true;
  });

  const getAreaNome = (c: string | null) => c ? (areas.find(a => a.codigo === c)?.nome || c) : '—';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--page-text)', marginBottom: '1rem' }}>Gestão de Usuários</h1>

      {error && <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{success}</div>}

      <input style={{ width: '100%', background: 'var(--surface-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }} placeholder="🔍 Buscar por nome, perfil ou cargo..." value={search} onChange={e => setSearch(e.target.value)} />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button onClick={() => openEdit(null)} style={{ ...primaryBtnStyle, maxWidth: '160px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          ➕ Novo Usuário
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <button onClick={async () => {
            if (!confirm(`Deseja deletar ${selectedIds.size} usuário(s)?`)) return;
            setError(null);
            try {
              for (const id of selectedIds) {
                await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
              }
              setSuccess(`${selectedIds.size} usuário(s) deletado(s).`);
              setSelectedIds(new Set());
              fetchUsers();
            } catch { setError('Erro ao deletar.'); }
          }} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            🗑️ Deletar Selecionados ({selectedIds.size})
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ background: 'var(--surface-bg)' }}>
            <tr>
              <th style={{ ...thStyle, width: '40px' }}>
                <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={(e) => {
                  if (e.target.checked) setSelectedIds(new Set(filtered.map(u => u.id)));
                  else setSelectedIds(new Set());
                }} />
              </th>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>Perfil</th>
              <th style={thStyle}>Nível</th>
              <th style={thStyle}>Cargo</th>
              <th style={thStyle}>Contato</th>
              <th style={thStyle}>Área</th>
              <th style={thStyle}>Ativo</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--page-text-dim)' }}>{loading ? 'Carregando...' : 'Nenhum usuário'}</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--row-border)', background: selectedIds.has(u.id) ? 'rgba(99,102,241,0.08)' : undefined }}>
                <td style={tdStyle}>
                  <input type="checkbox" checked={selectedIds.has(u.id)} onChange={(e) => {
                    const next = new Set(selectedIds);
                    if (e.target.checked) next.add(u.id); else next.delete(u.id);
                    setSelectedIds(next);
                  }} />
                </td>
                <td style={tdStyle}>{u.nome}</td>
                <td style={tdStyle}><span style={{ background: perfilColor(u.perfil), padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>{u.perfil}</span></td>
                <td style={tdStyle}>{u.nivelEscalonamento || '—'}</td>
                <td style={tdStyle}>{u.cargo || '—'}</td>
                <td style={tdStyle}>{u.contato || '—'}</td>
                <td style={tdStyle}>{getAreaNome(u.areaCodigo)}</td>
                <td style={tdStyle}>{u.ativo ? '✅' : '❌'}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => openEdit(u)} style={editBtnStyle}>Editar</button>
                    <button onClick={() => openClone(u)} style={{ ...editBtnStyle, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}>Clonar</button>
                    <button onClick={async () => {
                      if (!confirm(`Deletar "${u.nome}"?`)) return;
                      try {
                        await fetch(`/api/users/${u.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                        setSuccess('Usuário deletado.'); fetchUsers();
                      } catch { setError('Erro'); }
                    }} style={{ ...editBtnStyle, background: '#dc2626', color: '#fff' }}>Deletar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição/Criação */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditing(null)}>
          <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--page-text)', marginBottom: '1rem' }}>{editing.id === 0 ? 'Novo Usuário' : 'Editar Usuário'}</h2>

            <Field label="Nome" value={fNome} onChange={setFNome} />
            <Field label="Username" value={fUsername} onChange={setFUsername} />
            {editing.id === 0 && <Field label="Senha" value={fSenha} onChange={setFSenha} placeholder="Senha inicial" />}
            <Field label="Cargo" value={fCargo} onChange={setFCargo} placeholder="Ex: Analista, Coordenador" />
            <div style={fieldStyle}><label style={labelStyle}>Nível de Escalonamento</label>
              <select style={inputStyle} value={fNivel} onChange={e => setFNivel(e.target.value)}>
                <option value="">Sem nível</option><option value="1º Escalão">1º Escalão</option><option value="2º Escalão">2º Escalão</option><option value="3º Escalão">3º Escalão</option><option value="4º Escalão">4º Escalão</option><option value="Direto">Direto</option>
              </select>
            </div>
            <Field label="Contato (telefone)" value={fContato} onChange={(v) => setFContato(maskPhone(v))} placeholder="(11) 99999-9999" />
            <div style={fieldStyle}><label style={labelStyle}>Perfil</label>
              <select style={inputStyle} value={fPerfil} onChange={e => setFPerfil(e.target.value)}>
                <option value="Plantonista">Plantonista</option><option value="Responsavel">Responsável</option><option value="Consultor">Consultor</option>{user?.perfil === 'Adm' && <option value="Adm">Adm</option>}
              </select>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>Área vinculada</label>
              <select style={inputStyle} value={fArea} onChange={e => setFArea(e.target.value)}>
                <option value="">Nenhuma</option>
                {areas.map(a => <option key={a.id} value={a.codigo}>{a.nome}</option>)}
              </select>
            </div>
            <div style={{ ...fieldStyle, flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
              <label style={labelStyle}>Ativo</label>
              <input type="checkbox" checked={fAtivo} onChange={e => setFAtivo(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.8rem', color: fAtivo ? 'var(--success-text)' : 'var(--error-text)' }}>{fAtivo ? 'Ativo' : 'Desabilitado'}</span>
            </div>

            {error && <div style={{ color: 'var(--error-text)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setEditing(null)} style={cancelBtnStyle}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (<div style={fieldStyle}><label style={labelStyle}>{label}</label><input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>);
}

function perfilColor(p: string) { return p === 'Adm' ? 'var(--badge-red-bg)' : p === 'Responsavel' ? 'var(--badge-yellow-bg)' : p === 'Consultor' ? 'var(--badge-indigo-bg)' : 'var(--badge-green-bg)'; }

function maskPhone(value: string) {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (match, p1, p2, p3) => {
    let res = `(${p1}`;
    if (p2) res += `) ${p2}`;
    if (p3) res += `-${p3}`;
    return res;
  });
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, (match, p1, p2, p3) => {
    let res = `(${p1}) ${p2}`;
    if (p3) res += `-${p3}`;
    return res;
  });
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--th-color)', textTransform: 'uppercase', fontSize: '0.65rem', borderBottom: '1px solid var(--th-border)' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', color: 'var(--page-text)' };
const editBtnStyle: React.CSSProperties = { background: 'var(--btn-edit-bg)', border: '1px solid var(--btn-edit-border)', color: 'var(--btn-edit-text)', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' };
const cancelBtnStyle: React.CSSProperties = { flex: 1, padding: '0.6rem', background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)', color: 'var(--btn-cancel-text)', borderRadius: '8px', cursor: 'pointer' };
const primaryBtnStyle: React.CSSProperties = { flex: 1, padding: '0.6rem', background: 'var(--btn-primary-bg)', border: 'none', color: 'var(--btn-primary-text)', borderRadius: '8px', cursor: 'pointer' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--page-text-muted)', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' };

export default UserManagement;
