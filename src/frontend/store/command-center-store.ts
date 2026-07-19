import { create } from 'zustand';
import type {
  Monitor,
  TeamPanel,
  ActiveIncident,
  ConnectionStatus,
  CommandCenterStore,
  AuthUser,
  AppView,
} from '../../shared/types';

// Determine initial auth state from localStorage
const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
const storedUser = typeof localStorage !== 'undefined' ? (() => {
  try { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; } catch { return null; }
})() : null;
const storedSelectedAreas = typeof localStorage !== 'undefined' ? (() => {
  try { const a = localStorage.getItem('selectedAreas'); return a ? JSON.parse(a) : []; } catch { return []; }
})() : [];

export const useCommandCenterStore = create<CommandCenterStore>((set) => ({
  monitors: [],
  teams: [],
  activeIncidents: [],
  connectionStatus: 'disconnected',

  // Auth state
  token: storedToken,
  user: storedUser,
  isAuthenticated: !!storedToken && !!storedUser,
  currentView: (storedToken && storedUser) ? 'monitor-mapping' : 'login',

  // Area selection state
  selectedAreas: storedSelectedAreas,

  // UI state
  toasts: [],

  setMonitors(monitors: Monitor[]) {
    set({ monitors });
  },

  setConnectionStatus(status: ConnectionStatus) {
    set({ connectionStatus: status });
  },

  updateTeamPanel(teamId: string, data: Partial<TeamPanel>) {
    set((state) => ({
      teams: state.teams.map((team) =>
        team.teamId === teamId ? { ...team, ...data } : team
      ),
    }));
  },

  login(token: string, user: AuthUser) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set((state) => ({ 
      token, 
      user, 
      isAuthenticated: true, 
      currentView: state.selectedAreas.length > 0 ? 'monitor-mapping' : 'area-selector' 
    }));
  },

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Do not remove selectedAreas so they are remembered for next login
    }
    set({ token: null, user: null, isAuthenticated: false, currentView: 'login' });
  },

  setCurrentView(view: AppView) {
    set({ currentView: view });
  },

  setSelectedAreas(areas: string[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('selectedAreas', JSON.stringify(areas));
    }
    set({ selectedAreas: areas });
  },

  addToast(toast) {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },

  removeToast(id: string) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// Additional actions not in the main interface but needed by the WebSocket hook
export function addActiveIncident(incident: ActiveIncident): void {
  useCommandCenterStore.setState((state) => ({
    activeIncidents: [...state.activeIncidents, incident],
  }));
}

export function updateIncidentEscalation(
  incidentId: string,
  escalationLevel: number
): void {
  useCommandCenterStore.setState((state) => ({
    activeIncidents: state.activeIncidents.map((inc) =>
      inc.id === incidentId
        ? { ...inc, currentEscalationLevel: escalationLevel }
        : inc
    ),
  }));
}

export function removeActiveIncident(incidentId: string): void {
  useCommandCenterStore.setState((state) => ({
    activeIncidents: state.activeIncidents.filter((inc) => inc.id !== incidentId),
  }));
}
