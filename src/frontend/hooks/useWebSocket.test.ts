import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCommandCenterStore } from '../store/command-center-store';
import { handleWebSocketMessage } from './useWebSocket';
import type { ActiveIncident } from '../../shared/types';

describe('handleWebSocketMessage', () => {
  beforeEach(() => {
    useCommandCenterStore.setState({
      monitors: [],
      teams: [],
      activeIncidents: [],
      connectionStatus: 'disconnected',
    });
  });

  it('should handle monitors:updated event', () => {
    handleWebSocketMessage({
      type: 'monitors:updated',
      data: {
        monitors: [
          { id: 1, name: 'CPU Alert', state: 'Alert', teamId: 'team-1', lastUpdated: new Date().toISOString() },
          { id: 2, name: 'Memory OK', state: 'OK', teamId: 'team-2', lastUpdated: new Date().toISOString() },
        ],
      },
    });

    const state = useCommandCenterStore.getState();
    expect(state.monitors).toHaveLength(2);
    expect(state.monitors[0].name).toBe('CPU Alert');
    expect(state.monitors[1].state).toBe('OK');
  });

  it('should handle incident:new event', () => {
    const incident: ActiveIncident = {
      id: 'inc-1',
      monitorId: 1,
      monitorName: 'CPU Alert',
      teamId: 'team-1',
      onCallPerson: 'John',
      startedAt: new Date(),
      currentEscalationLevel: 0,
      timeUntilNextEscalation: 900,
    };

    handleWebSocketMessage({
      type: 'incident:new',
      data: { incident },
    });

    const state = useCommandCenterStore.getState();
    expect(state.activeIncidents).toHaveLength(1);
    expect(state.activeIncidents[0].id).toBe('inc-1');
    expect(state.activeIncidents[0].onCallPerson).toBe('John');
  });

  it('should handle incident:escalated event', () => {
    // Pre-populate an incident
    useCommandCenterStore.setState({
      activeIncidents: [
        {
          id: 'inc-1',
          monitorId: 1,
          monitorName: 'CPU Alert',
          teamId: 'team-1',
          onCallPerson: 'John',
          startedAt: new Date(),
          currentEscalationLevel: 0,
          timeUntilNextEscalation: 900,
        },
      ],
    });

    handleWebSocketMessage({
      type: 'incident:escalated',
      data: {
        escalation: {
          incidentId: 'inc-1',
          escalationLevel: 2,
        },
      },
    });

    const state = useCommandCenterStore.getState();
    expect(state.activeIncidents[0].currentEscalationLevel).toBe(2);
  });

  it('should handle incident:resolved event', () => {
    // Pre-populate incidents
    useCommandCenterStore.setState({
      activeIncidents: [
        {
          id: 'inc-1',
          monitorId: 1,
          monitorName: 'CPU Alert',
          teamId: 'team-1',
          onCallPerson: 'John',
          startedAt: new Date(),
          currentEscalationLevel: 0,
          timeUntilNextEscalation: 900,
        },
        {
          id: 'inc-2',
          monitorId: 2,
          monitorName: 'Memory Alert',
          teamId: 'team-2',
          onCallPerson: 'Jane',
          startedAt: new Date(),
          currentEscalationLevel: 1,
          timeUntilNextEscalation: 500,
        },
      ],
    });

    handleWebSocketMessage({
      type: 'incident:resolved',
      data: { incident: { id: 'inc-1' } },
    });

    const state = useCommandCenterStore.getState();
    expect(state.activeIncidents).toHaveLength(1);
    expect(state.activeIncidents[0].id).toBe('inc-2');
  });

  it('should ignore unknown message types', () => {
    handleWebSocketMessage({
      type: 'unknown:event',
      data: { foo: 'bar' },
    });

    const state = useCommandCenterStore.getState();
    expect(state.monitors).toEqual([]);
    expect(state.activeIncidents).toEqual([]);
  });
});
