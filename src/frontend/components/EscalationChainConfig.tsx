import React, { useState, useEffect, useCallback } from 'react';
import type { EscalationChainMember, TeamPanel } from '../../shared/types';
import { useCommandCenterStore } from '../store/command-center-store';
import './EscalationChainConfig.css';

/**
 * EscalationChainConfig component — interface for configuring escalation chains per team.
 * Allows selecting a team, viewing/editing its escalation chain, reordering members
 * with up/down arrow buttons, and saving via API.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

export interface EscalationChainConfigProps {
  /** API base URL, defaults to empty string (same origin) */
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

  const [chainState, setChainState] = useState<ChainState>({
    members: [],
    loading: false,
    error: null,
    saveStatus: 'idle',
    saveError: null,
  });

  // New member form state
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonContact, setNewPersonContact] = useState('');

  const fetchChain = useCallback(async (teamId: string) => {
    if (!teamId) return;

    setChainState((prev) => ({ ...prev, loading: true, error: null, saveStatus: 'idle', saveError: null }));

    try {
      const response = await fetch(`${apiBaseUrl}/api/teams/${teamId}/escalation-chain`);
      if (!response.ok) {
        throw new Error('Falha ao carregar cadeia de escalação');
      }
      const data: EscalationChainMember[] = await response.json();
      setChainState({
        members: data,
        loading: false,
        error: null,
        saveStatus: 'idle',
        saveError: null,
      });
    } catch (err) {
      setChainState({
        members: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        saveStatus: 'idle',
        saveError: null,
      });
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchChain(selectedTeamId);
    } else {
      setChainState({ members: [], loading: false, error: null, saveStatus: 'idle', saveError: null });
    }
  }, [selectedTeamId, fetchChain]);

  const handleTeamSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTeamId(e.target.value);
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setChainState((prev) => {
      const newMembers = [...prev.members];
      const temp = newMembers[index];
      newMembers[index] = newMembers[index - 1];
      newMembers[index - 1] = temp;
      // Recalculate positions
      const reindexed = newMembers.map((m, i) => ({ ...m, position: i + 1 }));
      return { ...prev, members: reindexed, saveStatus: 'idle', saveError: null };
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setChainState((prev) => {
      if (index >= prev.members.length - 1) return prev;
      const newMembers = [...prev.members];
      const temp = newMembers[index];
      newMembers[index] = newMembers[index + 1];
      newMembers[index + 1] = temp;
      // Recalculate positions
      const reindexed = newMembers.map((m, i) => ({ ...m, position: i + 1 }));
      return { ...prev, members: reindexed, saveStatus: 'idle', saveError: null };
    });
  }, []);

  const handleRemoveMember = useCallback((index: number) => {
    setChainState((prev) => {
      const newMembers = prev.members.filter((_, i) => i !== index);
      const reindexed = newMembers.map((m, i) => ({ ...m, position: i + 1 }));
      return { ...prev, members: reindexed, saveStatus: 'idle', saveError: null };
    });
  }, []);

  const handleAddMember = useCallback(() => {
    const trimmedName = newPersonName.trim();
    if (!trimmedName) return;

    setChainState((prev) => {
      const newMember: EscalationChainMember = {
        personName: trimmedName,
        personContact: newPersonContact.trim() || undefined,
        position: prev.members.length + 1,
      };
      return { ...prev, members: [...prev.members, newMember], saveStatus: 'idle', saveError: null };
    });
    setNewPersonName('');
    setNewPersonContact('');
  }, [newPersonName, newPersonContact]);

  const handleSave = useCallback(async () => {
    if (!selectedTeamId) return;

    setChainState((prev) => ({ ...prev, saveStatus: 'saving', saveError: null }));

    try {
      const response = await fetch(`${apiBaseUrl}/api/teams/${selectedTeamId}/escalation-chain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chainState.members),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar cadeia de escalação');
      }

      setChainState((prev) => ({ ...prev, saveStatus: 'success', saveError: null }));

      // Reset success indicator after 3 seconds
      setTimeout(() => {
        setChainState((prev) =>
          prev.saveStatus === 'success' ? { ...prev, saveStatus: 'idle' } : prev
        );
      }, 3000);
    } catch (err) {
      setChainState((prev) => ({
        ...prev,
        saveStatus: 'error',
        saveError: err instanceof Error ? err.message : 'Erro ao salvar',
      }));
    }
  }, [apiBaseUrl, selectedTeamId, chainState.members]);

  return (
    <div className="escalation-chain-config">
      <h2 className="escalation-chain-config__title">Configuração de Cadeia de Escalação</h2>

      <TeamSelector
        teams={teams}
        selectedTeamId={selectedTeamId}
        onChange={handleTeamSelect}
      />

      {chainState.error && (
        <div className="escalation-chain-config__error" role="alert">
          {chainState.error}
        </div>
      )}

      {chainState.loading && (
        <p className="escalation-chain-config__loading">Carregando cadeia...</p>
      )}

      {selectedTeamId && !chainState.loading && !chainState.error && (
        <>
          <ChainMembersList
            members={chainState.members}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemove={handleRemoveMember}
          />

          <AddMemberForm
            personName={newPersonName}
            personContact={newPersonContact}
            onNameChange={setNewPersonName}
            onContactChange={setNewPersonContact}
            onAdd={handleAddMember}
          />

          <SaveControls
            saveStatus={chainState.saveStatus}
            saveError={chainState.saveError}
            onSave={handleSave}
            disabled={chainState.members.length === 0}
          />
        </>
      )}
    </div>
  );
}

/** Team selector dropdown */
function TeamSelector({
  teams,
  selectedTeamId,
  onChange,
}: {
  teams: TeamPanel[];
  selectedTeamId: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.ReactElement {
  return (
    <div className="escalation-chain-config__selector">
      <label className="escalation-chain-config__label" htmlFor="team-select">
        Time
      </label>
      <select
        id="team-select"
        className="escalation-chain-config__select"
        value={selectedTeamId}
        onChange={onChange}
        aria-label="Selecionar time para configurar cadeia de escalação"
      >
        <option value="">Selecionar time...</option>
        {teams.map((team) => (
          <option key={team.teamId} value={team.teamId}>
            {team.teamName}
          </option>
        ))}
      </select>
    </div>
  );
}

/** List of chain members with reorder and remove controls */
function ChainMembersList({
  members,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  members: EscalationChainMember[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
}): React.ReactElement {
  if (members.length === 0) {
    return (
      <div className="escalation-chain-config__empty">
        <span className="escalation-chain-config__empty-icon">⚠</span>
        <span className="escalation-chain-config__empty-text">
          Cadeia de escalação vazia. Adicione membros abaixo.
        </span>
      </div>
    );
  }

  return (
    <div className="escalation-chain-config__members">
      <h3 className="escalation-chain-config__section-title">
        Membros da Cadeia ({members.length})
      </h3>
      <ol className="escalation-chain-config__list" role="list">
        {members.map((member, index) => (
          <li key={`${member.personName}-${member.position}`} className="escalation-chain-config__item">
            <span className="escalation-chain-config__position">{member.position}</span>
            <div className="escalation-chain-config__member-info">
              <span className="escalation-chain-config__member-name">{member.personName}</span>
              {member.personContact && (
                <span className="escalation-chain-config__member-contact">{member.personContact}</span>
              )}
            </div>
            <div className="escalation-chain-config__actions">
              <button
                className="escalation-chain-config__move-btn"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                aria-label={`Mover ${member.personName} para cima`}
                title="Mover para cima"
              >
                ▲
              </button>
              <button
                className="escalation-chain-config__move-btn"
                onClick={() => onMoveDown(index)}
                disabled={index === members.length - 1}
                aria-label={`Mover ${member.personName} para baixo`}
                title="Mover para baixo"
              >
                ▼
              </button>
              <button
                className="escalation-chain-config__remove-btn"
                onClick={() => onRemove(index)}
                aria-label={`Remover ${member.personName} da cadeia`}
                title="Remover"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Form to add new member to the chain */
function AddMemberForm({
  personName,
  personContact,
  onNameChange,
  onContactChange,
  onAdd,
}: {
  personName: string;
  personContact: string;
  onNameChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onAdd: () => void;
}): React.ReactElement {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && personName.trim()) {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="escalation-chain-config__add-form">
      <h3 className="escalation-chain-config__section-title">Adicionar Membro</h3>
      <div className="escalation-chain-config__form-fields">
        <input
          className="escalation-chain-config__input"
          type="text"
          placeholder="Nome *"
          value={personName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Nome do membro"
          required
        />
        <input
          className="escalation-chain-config__input"
          type="text"
          placeholder="Contato (opcional)"
          value={personContact}
          onChange={(e) => onContactChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Contato do membro"
        />
        <button
          className="escalation-chain-config__add-btn"
          onClick={onAdd}
          disabled={!personName.trim()}
          aria-label="Adicionar membro à cadeia"
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}

/** Save button with status feedback */
function SaveControls({
  saveStatus,
  saveError,
  onSave,
  disabled,
}: {
  saveStatus: SaveStatus;
  saveError: string | null;
  onSave: () => void;
  disabled: boolean;
}): React.ReactElement {
  return (
    <div className="escalation-chain-config__save">
      <button
        className="escalation-chain-config__save-btn"
        onClick={onSave}
        disabled={disabled || saveStatus === 'saving'}
        aria-label="Salvar cadeia de escalação"
      >
        {saveStatus === 'saving' ? (
          <>
            <span className="escalation-chain-config__spinner" /> Salvando...
          </>
        ) : (
          'Salvar Cadeia'
        )}
      </button>

      {saveStatus === 'success' && (
        <span className="escalation-chain-config__save-success" role="status">
          ✓ Cadeia salva com sucesso
        </span>
      )}

      {saveStatus === 'error' && saveError && (
        <span className="escalation-chain-config__save-error" role="alert">
          {saveError}
        </span>
      )}
    </div>
  );
}

export default EscalationChainConfig;
