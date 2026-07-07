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

  // Form
  const [fNome, setFNome] = useState('');
  const [fUsername, setFUsername] = useState('');
  const [fCargo, setFCargo] = useState('');
  const [fNivel, setFNivel] = useState('');
  const [fContato, setFContato] = useState('');
  const [fPerfil, setFPerfil] = useState('');
  const [fArea, setFArea] = useState('');
  const [fAtivo, setFAtivo] = useState(true);
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

  const openEdit = (u: UserItem) => {
    setEditing(u); setFNome(u.nome); setFUsername(u.username);
    setFCargo(u.cargo || ''); setFNivel(u.nivelEscalonamento || '');
    setFContato(u.contato || ''); setFPerfil(u.perfil);
    setFArea(u.areaCodigo || ''); setFAtivo(u.ativo);
    setError(null); setSuccess(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true); setError(null);
    try {
      const body = { nome: fNome, username: fUsername, cargo: fCargo || null, nivelEscalonamento: fNivel || null, contato: fContato || null, perfil: fPerfil, areaCodigo: fArea || null, ativo: fAtivo };
      const r = await fetch(`/api/users/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (r.ok) { setSuccess('Usuário atualizado!'); setEditing(null); fetchUsers(); }
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
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e4e4e7', marginBottom: '1rem' }}>Gestão de Usuários</h1>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{success}</div>}

      <input style={{ width: '100%', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }} placeholder="🔍 Buscar por nome, perfil ou cargo..." value={search} onChange={e => setSearch(e.target.value)} />

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ background: '#1e1e2e' }}>
            <tr>
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
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>{loading ? 'Carregando...' : 'Nenhum usuário'}</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={tdStyle}>{u.nome}</td>
                <td style={tdStyle}><span style={{ background: perfilColor(u.perfil), padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>{u.perfil}</span></td>
                <td style={tdStyle}>{u.nivelEscalonamento || '—'}</td>
                <td style={tdStyle}>{u.cargo || '—'}</td>
                <td style={tdStyle}>{u.contato || '—'}</td>
                <td style={tdStyle}>{getAreaNome(u.areaCodigo)}</td>
                <td style={tdStyle}>{u.ativo ? '✅' : '❌'}</td>
                <td style={tdStyle}><button onClick={() => openEdit(u)} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditing(null)}>
          <div style={{ background: '#0d1b2a', border: '1px solid #1e90ff', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', color: '#e4e4e7', marginBottom: '1rem' }}>Editar Usuário</h2>

            <Field label="Nome" value={fNome} onChange={setFNome} />
            <Field label="Username" value={fUsername} onChange={setFUsername} />
            <Field label="Cargo" value={fCargo} onChange={setFCargo} placeholder="Ex: Analista, Coordenador" />
            <div style={fieldStyle}><label style={labelStyle}>Nível de Escalonamento</label>
              <select style={inputStyle} value={fNivel} onChange={e => setFNivel(e.target.value)}>
                <option value="">Sem nível</option><option value="1º Escalão">1º Escalão</option><option value="2º Escalão">2º Escalão</option><option value="3º Escalão">3º Escalão</option><option value="4º Escalão">4º Escalão</option><option value="Direto">Direto</option>
              </select>
            </div>
            <Field label="Contato (telefone)" value={fContato} onChange={setFContato} placeholder="(11) 99999-9999" />
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
              <span style={{ fontSize: '0.8rem', color: fAtivo ? '#22c55e' : '#ef4444' }}>{fAtivo ? 'Ativo' : 'Desabilitado'}</span>
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '0.6rem', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '0.6rem', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
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

function perfilColor(p: string) { return p === 'Adm' ? 'rgba(239,68,68,0.2)' : p === 'Responsavel' ? 'rgba(245,158,11,0.2)' : p === 'Consultor' ? 'rgba(99,102,241,0.2)' : 'rgba(34,197,94,0.2)'; }

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', fontSize: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.08)' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', color: '#e4e4e7' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { background: '#1a2332', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', padding: '0.5rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' };

export default UserManagement;
