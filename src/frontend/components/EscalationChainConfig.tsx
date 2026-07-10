import React, { useState, useEffect, useCallback } from 'react';
import type { EscalationChainMember, TeamPanel } from '../../shared/types';
import { useCommandCenterStore } from '../store/command-center-store';

/**
 * EscalationChainConfig component — interface for configuring escalation chains per team.
 * Layout padronizado conforme tela "Gestão de Usuários".
 */

export interface EscalationChainConfigProps {
  apiBaseUrl?: string;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface ChainState {
  members: EscalationChainMember[];
  loading: boolean;
  error: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
}

export function EscalationChainConfig({ apiBaseUrl = '' }: EscalationChainConfigProps): React.ReactElement {
  const teams = useCommandCenterStore((state) => state.teams);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [search, setSearch] = useState('');

  const [chainState, setChainState] = useState<ChainState>({
    members: [],
    loading: false,
    error: null,
    saveStatus: 'idle',
    saveError: null,
  });

  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonContact, setNewPersonContact] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchChain = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setChainState((prev) => ({ ...prev, loading: true, error: null, saveStatus: 'idle', saveError: null }));
    try {
      const response = await fetch(`${apiBaseUrl}/api/teams/${teamId}/escalation-chain`);
      if (!response.ok) throw new Error('Falha ao carregar cadeia de escalação');
      const data: EscalationChainMember[] = await response.json();
      setChainState({ members: data, loading: false, error: null, saveStatus: 'idle', saveError: null });
    } catch (err) {
      setChainState({ members: [], loading: false, error: err instanceof Error ? err.message : 'Erro desconhecido', saveStatus: 'idle', saveError: null });
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (selectedTeamId) { fetchChain(selectedTeamId); }
    else { setChainState({ members: [], loading: false, error: null, saveStatus: 'idle', saveError: null }); }
  }, [selectedTeamId, fetchChain]);

  const handleTeamSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedTeamId(e.target.value); }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setChainState((prev) => {
      const newMembers = [...prev.members];
      const temp = newMembers[index]; newMembers[index] = newMembers[index - 1]; newMembers[index - 1] = temp;
      return { ...prev, members: newMembers.map((m, i) => ({ ...m, position: i + 1 })), saveStatus: 'idle', saveError: null };
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setChainState((prev) => {
      if (index >= prev.members.length - 1) return prev;
      const newMembers = [...prev.members];
      const temp = newMembers[index]; newMembers[index] = newMembers[index + 1]; newMembers[index + 1] = temp;
      return { ...prev, members: newMembers.map((m, i) => ({ ...m, position: i + 1 })), saveStatus: 'idle', saveError: null };
    });
  }, []);

  const handleRemoveMember = useCallback((index: number) => {
    setChainState((prev) => {
      const newMembers = prev.members.filter((_, i) => i !== index);
      return { ...prev, members: newMembers.map((m, i) => ({ ...m, position: i + 1 })), saveStatus: 'idle', saveError: null };
    });
  }, []);

  const handleAddMember = useCallback(() => {
    const trimmedName = newPersonName.trim();
    if (!trimmedName) return;
    setChainState((prev) => {
      const newMember: EscalationChainMember = { personName: trimmedName, personContact: newPersonContact.trim() || undefined, position: prev.members.length + 1 };
      return { ...prev, members: [...prev.members, newMember], saveStatus: 'idle', saveError: null };
    });
    setNewPersonName(''); setNewPersonContact(''); setShowAddForm(false);
  }, [newPersonName, newPersonContact]);

  const handleSave = useCallback(async () => {
    if (!selectedTeamId) return;
    setChainState((prev) => ({ ...prev, saveStatus: 'saving', saveError: null }));
    try {
      const response = await fetch(`${apiBaseUrl}/api/teams/${selectedTeamId}/escalation-chain`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chainState.members),
      });
      if (!response.ok) throw new Error('Falha ao salvar cadeia de escalação');
      setChainState((prev) => ({ ...prev, saveStatus: 'success', saveError: null }));
      setTimeout(() => { setChainState((prev) => prev.saveStatus === 'success' ? { ...prev, saveStatus: 'idle' } : prev); }, 3000);
    } catch (err) {
      setChainState((prev) => ({ ...prev, saveStatus: 'error', saveError: err instanceof Error ? err.message : 'Erro ao salvar' }));
    }
  }, [apiBaseUrl, selectedTeamId, chainState.members]);

  const filteredMembers = chainState.members.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.personName.toLowerCase().includes(s) || (m.personContact || '').toLowerCase().includes(s);
  });

  const selectedTeamName = teams.find(t => t.teamId === selectedTeamId)?.teamName || '';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e4e4e7', marginBottom: '1rem' }}>Cadeia de Escalação</h1>

      {chainState.error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{chainState.error}</div>}
      {chainState.saveStatus === 'success' && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>✓ Cadeia salva com sucesso</div>}
      {chainState.saveStatus === 'error' && chainState.saveError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{chainState.saveError}</div>}

      {/* Selector + Search */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select style={{ background: '#1a2332', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', minWidth: '200px' }} value={selectedTeamId} onChange={handleTeamSelect} aria-label="Selecionar time">
          <option value="">Selecionar time...</option>
          {teams.map((team) => (<option key={team.teamId} value={team.teamId}>{team.teamName}</option>))}
        </select>
        <input style={{ flex: 1, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }} placeholder="🔍 Buscar por nome ou contato..." value={search} onChange={e => setSearch(e.target.value)} disabled={!selectedTeamId} />
        {selectedTeamId && (
          <button onClick={() => setShowAddForm(true)} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>+ Adicionar Membro</button>
        )}
      </div>

      {/* Table */}
      {selectedTeamId && (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead style={{ background: '#1e1e2e' }}>
                <tr>
                  <th style={thStyle}>Posição</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Contato</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {chainState.loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Carregando...</td></tr>
                ) : filteredMembers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Cadeia vazia. Adicione membros acima.</td></tr>
                ) : filteredMembers.map((member, index) => (
                  <tr key={`${member.personName}-${member.position}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={tdStyle}>
                      <span style={{ background: 'rgba(99,102,241,0.2)', padding: '0.2rem 0.5rem', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>{member.position}</span>
                    </td>
                    <td style={tdStyle}>{member.personName}</td>
                    <td style={tdStyle}>{member.personContact || '—'}</td>
                    <td style={tdStyle}><span style={{ background: 'rgba(34,197,94,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', color: '#22c55e' }}>{selectedTeamName}</span></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <button onClick={() => handleMoveUp(index)} disabled={index === 0} style={{ ...actionBtnStyle, opacity: index === 0 ? 0.3 : 1 }} title="Mover para cima" aria-label={`Mover ${member.personName} para cima`}>▲</button>
                        <button onClick={() => handleMoveDown(index)} disabled={index === chainState.members.length - 1} style={{ ...actionBtnStyle, opacity: index === chainState.members.length - 1 ? 0.3 : 1 }} title="Mover para baixo" aria-label={`Mover ${member.personName} para baixo`}>▼</button>
                        <button onClick={() => handleRemoveMember(index)} style={{ ...actionBtnStyle, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} title="Remover" aria-label={`Remover ${member.personName}`}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save button */}
          {chainState.members.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={chainState.saveStatus === 'saving'} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, opacity: chainState.saveStatus === 'saving' ? 0.5 : 1 }}>
                {chainState.saveStatus === 'saving' ? 'Salvando...' : 'Salvar Cadeia'}
              </button>
            </div>
          )}
        </>
      )}

      {!selectedTeamId && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Selecione um time para visualizar/editar a cadeia de escalação.
        </div>
      )}

      {/* Modal Adicionar Membro */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowAddForm(false)}>
          <div style={{ background: '#0d1b2a', border: '1px solid #1e90ff', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', color: '#e4e4e7', marginBottom: '1rem' }}>Adicionar Membro</h2>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nome *</label>
              <input style={inputStyle} value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Nome do membro" onKeyDown={e => { if (e.key === 'Enter' && newPersonName.trim()) { e.preventDefault(); handleAddMember(); } }} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Contato</label>
              <input style={inputStyle} value={newPersonContact} onChange={e => setNewPersonContact(e.target.value)} placeholder="Telefone (opcional)" onKeyDown={e => { if (e.key === 'Enter' && newPersonName.trim()) { e.preventDefault(); handleAddMember(); } }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '0.6rem', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', color: '#e4e4e7', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAddMember} disabled={!newPersonName.trim()} style={{ flex: 1, padding: '0.6rem', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', opacity: !newPersonName.trim() ? 0.5 : 1 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--th-color)', textTransform: 'uppercase', fontSize: '0.65rem', borderBottom: '1px solid var(--th-border)' };
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', color: 'var(--page-text)' };
const actionBtnStyle: React.CSSProperties = { background: 'var(--btn-edit-bg)', border: '1px solid var(--btn-edit-border)', color: 'var(--btn-edit-text)', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--page-text-muted)', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', padding: '0.5rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem' };

export default EscalationChainConfig;
