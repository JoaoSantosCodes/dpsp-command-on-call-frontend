import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCommandCenterStore,
  addActiveIncident,
  updateIncidentEscalation,
  removeActiveIncident,
} from './command-center-store';
import type { Monitor, TeamPanel, ActiveIncident } from '../../shared/types';

describe('CommandCenterStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCommandCenterStore.setState({
      monitors: [],
      teams: [],
      activeIncidents: [],
      connectionStatus: 'disconnected',
    });
  });

  describe('initial state', () => {
    it('should start with empty monitors', () => {
      expect(useCommandCenterStore.getState().monitors).toEqual([]);
    });

    it('should start with empty teams', () => {
      expect(useCommandCenterStore.getState().teams).toEqual([]);
    });

    it('should start with empty activeIncidents', () => {
      expect(useCommandCenterStore.getState().activeIncidents).toEqual([]);
    });

    it('should start with disconnected status', () => {
      expect(useCommandCenterStore.getState().connectionStatus).toBe('disconnected');
    });
  });

  describe('setMonitors', () => {
    it('should update monitors list', () => {
      const monitors: Monitor[] = [
        { id: 1, name: 'CPU Alert', state: 'OK', teamId: 'team-1', lastUpdated: new Date() },
        { id: 2, name: 'Memory Alert', state: 'Alert', teamId: 'team-2', lastUpdated: new Date() },
      ];

      useCommandCenterStore.getState().setMonitors(monitors);

      expect(useCommandCenterStore.getState().monitors).toEqual(monitors);
    });

    it('should replace all monitors on update', () => {
      const initial: Monitor[] = [
        { id: 1, name: 'Old Monitor', state: 'OK', teamId: 'team-1', lastUpdated: new Date() },
      ];
      const updated: Monitor[] = [
        { id: 2, name: 'New Monitor', state: 'Alert', teamId: 'team-2', lastUpdated: new Date() },
      ];

      useCommandCenterStore.getState().setMonitors(initial);
      useCommandCenterStore.getState().setMonitors(updated);

      expect(useCommandCenterStore.getState().monitors).toEqual(updated);
      expect(useCommandCenterStore.getState().monitors).toHaveLength(1);
    });
  });

  describe('setConnectionStatus', () => {
    it('should update connection status to connected', () => {
      useCommandCenterStore.getState().setConnectionStatus('connected');
      expect(useCommandCenterStore.getState().connectionStatus).toBe('connected');
    });

    it('should update connection status to reconnecting', () => {
      useCommandCenterStore.getState().setConnectionStatus('reconnecting');
      expect(useCommandCenterStore.getState().connectionStatus).toBe('reconnecting');
    });

    it('should update connection status to disconnected', () => {
      useCommandCenterStore.getState().setConnectionStatus('connected');
      useCommandCenterStore.getState().setConnectionStatus('disconnected');
      expect(useCommandCenterStore.getState().connectionStatus).toBe('disconnected');
    });
  });

  describe('updateTeamPanel', () => {
    const teams: TeamPanel[] = [
      {
        teamId: 'team-1',
        teamName: 'Team Alpha',
        currentOnCall: { name: 'John', contact: 'john@example.com' },
        shiftStart: '08:00',
        shiftEnd: '20:00',
        monitors: [],
        activeIncidents: [],
        escalationChainConfigured: true,
      },
      {
        teamId: 'team-2',
        teamName: 'Team Beta',
        currentOnCall: null,
        shiftStart: '00:00',
        shiftEnd: '00:00',
        monitors: [],
        activeIncidents: [],
        escalationChainConfigured: false,
      },
    ];

    beforeEach(() => {
      useCommandCenterStore.setState({ teams });
    });

    it('should update a specific team panel', () => {
      useCommandCenterStore.getState().updateTeamPanel('team-1', {
        currentOnCall: { name: 'Jane', contact: 'jane@example.com' },
      });

      const state = useCommandCenterStore.getState();
      expect(state.teams[0].currentOnCall?.name).toBe('Jane');
      // Other team should remain unchanged
      expect(state.teams[1].currentOnCall).toBeNull();
    });

    it('should not affect other teams when updating one', () => {
      useCommandCenterStore.getState().updateTeamPanel('team-2', {
        escalationChainConfigured: true,
      });

      const state = useCommandCenterStore.getState();
      expect(state.teams[0].teamName).toBe('Team Alpha');
      expect(state.teams[1].escalationChainConfigured).toBe(true);
    });

    it('should handle updating non-existent team gracefully', () => {
      useCommandCenterStore.getState().updateTeamPanel('non-existent', {
        teamName: 'Ghost Team',
      });

      const state = useCommandCenterStore.getState();
      expect(state.teams).toHaveLength(2);
      expect(state.teams[0].teamName).toBe('Team Alpha');
      expect(state.teams[1].teamName).toBe('Team Beta');
    });
  });

  describe('addActiveIncident', () => {
    it('should add an incident to activeIncidents', () => {
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

      addActiveIncident(incident);

      expect(useCommandCenterStore.getState().activeIncidents).toHaveLength(1);
      expect(useCommandCenterStore.getState().activeIncidents[0]).toEqual(incident);
    });

    it('should append to existing incidents', () => {
      const incident1: ActiveIncident = {
        id: 'inc-1',
        monitorId: 1,
        monitorName: 'CPU Alert',
        teamId: 'team-1',
        onCallPerson: 'John',
        startedAt: new Date(),
        currentEscalationLevel: 0,
        timeUntilNextEscalation: 900,
      };
      const incident2: ActiveIncident = {
        id: 'inc-2',
        monitorId: 2,
        monitorName: 'Memory Alert',
        teamId: 'team-2',
        onCallPerson: 'Jane',
        startedAt: new Date(),
        currentEscalationLevel: 0,
        timeUntilNextEscalation: 900,
      };

      addActiveIncident(incident1);
      addActiveIncident(incident2);

      expect(useCommandCenterStore.getState().activeIncidents).toHaveLength(2);
    });
  });

  describe('updateIncidentEscalation', () => {
    beforeEach(() => {
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
      useCommandCenterStore.setState({ activeIncidents: [incident] });
    });

    it('should update escalation level of a specific incident', () => {
      updateIncidentEscalation('inc-1', 2);

      const incidents = useCommandCenterStore.getState().activeIncidents;
      expect(incidents[0].currentEscalationLevel).toBe(2);
    });

    it('should not modify other incidents', () => {
      const incident2: ActiveIncident = {
        id: 'inc-2',
        monitorId: 2,
        monitorName: 'Memory Alert',
        teamId: 'team-2',
        onCallPerson: 'Jane',
        startedAt: new Date(),
        currentEscalationLevel: 1,
        timeUntilNextEscalation: 500,
      };
      useCommandCenterStore.setState((state) => ({
        activeIncidents: [...state.activeIncidents, incident2],
      }));

      updateIncidentEscalation('inc-1', 3);

      const incidents = useCommandCenterStore.getState().activeIncidents;
      expect(incidents[0].currentEscalationLevel).toBe(3);
      expect(incidents[1].currentEscalationLevel).toBe(1);
    });
  });

  describe('removeActiveIncident', () => {
    beforeEach(() => {
      const incidents: ActiveIncident[] = [
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
      ];
      useCommandCenterStore.setState({ activeIncidents: incidents });
    });

    it('should remove the specified incident', () => {
      removeActiveIncident('inc-1');

      const incidents = useCommandCenterStore.getState().activeIncidents;
      expect(incidents).toHaveLength(1);
      expect(incidents[0].id).toBe('inc-2');
    });

    it('should handle removing non-existent incident gracefully', () => {
      removeActiveIncident('non-existent');

      expect(useCommandCenterStore.getState().activeIncidents).toHaveLength(2);
    });
  });
});
