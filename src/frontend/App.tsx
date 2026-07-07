import React, { useCallback, useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useCommandCenterStore } from './store/command-center-store';
import { Dashboard } from './components/Dashboard';
import { CSVImport } from './components/CSVImport';
import { IncidentHistory } from './components/IncidentHistory';
import { MonitorMapping } from './components/MonitorMapping';
import { EscalationChainConfig } from './components/EscalationChainConfig';
import { AreaManagement } from './components/AreaManagement';
import { PlantonistManagement } from './components/PlantonistManagement';
import { PeriodoManagement } from './components/PeriodoManagement';
import { EscalaManagement } from './components/EscalaManagement';
import { HorarioManagement } from './components/HorarioManagement';
import { ProblemaManagement } from './components/ProblemaManagement';
import { TeamManagement } from './components/TeamManagement';
import { Login } from './components/Login';
import { RegisterUser } from './components/RegisterUser';
import { AreaSelector } from './components/AreaSelector';
import { SetupWizard } from './components/SetupWizard';
import './App.css';

import type { AppView } from '../shared/types';

/**
 * Main navigation views accessible once authenticated.
 */
type AuthenticatedView = 'dashboard' | 'csv-import' | 'incident-history' | 'monitor-mapping' | 'escalation-config' | 'area-management' | 'plantonist-management' | 'periodo-management' | 'escala-management' | 'horario-management' | 'problema-management' | 'team-management';

interface NavItem {
  id: AuthenticatedView;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'monitor-mapping', label: 'Mapa', icon: '' },
  { id: 'csv-import', label: 'Importar', icon: '' },
  { id: 'area-management', label: 'Áreas', icon: '' },
  { id: 'plantonist-management', label: 'Plantonistas', icon: '' },
  { id: 'escala-management', label: 'Escalas', icon: '' },
  { id: 'horario-management', label: 'Horários', icon: '' },
  { id: 'problema-management', label: 'Problemas', icon: '' },
];

/** Admin-only nav items */
const ADMIN_NAV_ITEMS: NavItem[] = [];

/**
 * App — Root component of the Command Center Datadog frontend.
 * Initializes WebSocket connection on mount and renders
 * all views via tab-based navigation.
 *
 * When not authenticated, renders Login screen.
 * The Dashboard is the primary view displaying the 11 team panels
 * in a grid layout. Other views are accessible via navigation tabs.
 *
 * Validates: Requirements 3.1, 9.2
 */
export function App(): React.ReactElement {
  const isAuthenticated = useCommandCenterStore((state) => state.isAuthenticated);
  const currentView = useCommandCenterStore((state) => state.currentView);
  const setCurrentView = useCommandCenterStore((state) => state.setCurrentView);

  // Show Register screen (must be checked before login since user is not authenticated yet)
  if (currentView === 'register') {
    return <RegisterUser />;
  }

  // Show Login screen if not authenticated
  if (!isAuthenticated || currentView === 'login') {
    return <Login />;
  }

  // Show Area Selector screen after login
  if (currentView === 'area-selector') {
    return <AreaSelector />;
  }

  // Show Setup Wizard screen after area selection
  if (currentView === 'setup-wizard') {
    return <SetupWizard />;
  }

  return <AuthenticatedApp currentView={currentView} setCurrentView={setCurrentView} />;
}

/**
 * Authenticated portion of the app with WebSocket and navigation.
 */
function AuthenticatedApp({
  currentView,
  setCurrentView,
}: {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}): React.ReactElement {
  // Initialize WebSocket connection at the app level
  useWebSocket();

  const teams = useCommandCenterStore((state) => state.teams);
  const activeIncidents = useCommandCenterStore((state) => state.activeIncidents);
  const connectionStatus = useCommandCenterStore((state) => state.connectionStatus);
  const logout = useCommandCenterStore((state) => state.logout);
  const userPerfil = useCommandCenterStore((state) => state.user?.perfil);

  // Theme toggle
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Build nav items per profile
  const navItems = (() => {
    if (userPerfil === 'Adm') return [
      { id: 'monitor-mapping' as AuthenticatedView, label: 'Mapa', icon: '' },
      { id: 'csv-import' as AuthenticatedView, label: 'Importar', icon: '' },
      { id: 'area-management' as AuthenticatedView, label: 'Áreas', icon: '' },
      { id: 'plantonist-management' as AuthenticatedView, label: 'Plantonistas', icon: '' },
      { id: 'escala-management' as AuthenticatedView, label: 'Escalas', icon: '' },
      { id: 'horario-management' as AuthenticatedView, label: 'Horários', icon: '' },
      { id: 'problema-management' as AuthenticatedView, label: 'Problemas', icon: '' },
    ];
    if (userPerfil === 'Responsavel') return [
      { id: 'monitor-mapping' as AuthenticatedView, label: 'Mapa', icon: '' },
      { id: 'csv-import' as AuthenticatedView, label: 'Exportar', icon: '' },
      { id: 'plantonist-management' as AuthenticatedView, label: 'Plantonistas', icon: '' },
      { id: 'escala-management' as AuthenticatedView, label: 'Escalas', icon: '' },
      { id: 'horario-management' as AuthenticatedView, label: 'Horários', icon: '' },
      { id: 'problema-management' as AuthenticatedView, label: 'Problemas', icon: '' },
    ];
    if (userPerfil === 'Plantonista') return [
      { id: 'monitor-mapping' as AuthenticatedView, label: 'Mapa', icon: '' },
      { id: 'escala-management' as AuthenticatedView, label: 'Minha Escala', icon: '' },
    ];
    if (userPerfil === 'Consultor') return [
      { id: 'monitor-mapping' as AuthenticatedView, label: 'Mapa', icon: '' },
      { id: 'csv-import' as AuthenticatedView, label: 'Exportar', icon: '' },
      { id: 'plantonist-management' as AuthenticatedView, label: 'Plantonistas', icon: '' },
      { id: 'escala-management' as AuthenticatedView, label: 'Escalas', icon: '' },
      { id: 'horario-management' as AuthenticatedView, label: 'Horários', icon: '' },
      { id: 'problema-management' as AuthenticatedView, label: 'Problemas', icon: '' },
    ];
    return [{ id: 'monitor-mapping' as AuthenticatedView, label: 'Mapa', icon: '' }];
  })();

  const handleNavClick = useCallback((view: AuthenticatedView) => {
    setCurrentView(view);
  }, [setCurrentView]);

  const handleAcknowledge = useCallback(async (incidentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/incidents/${incidentId}/acknowledge`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Error handling silently — store will be updated via WebSocket event
    }
  }, []);

  return (
    <div className="app">
      <nav className="app__nav" role="navigation" aria-label="Navegação principal">
        <div className="app__nav-left">
          <button className="app__nav-profile" onClick={logout} title="Clique para sair">
            Perfil do Usuário
          </button>
          <ConnectionIndicator status={connectionStatus} />
          <button className="app__theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
        <ul className="app__nav-tabs" role="tablist">
          {navItems.map((item) => (
            <li key={item.id} role="presentation">
              <button
                className={`app__nav-tab ${currentView === item.id ? 'app__nav-tab--active' : ''}`}
                role="tab"
                aria-selected={currentView === item.id}
                aria-controls={`panel-${item.id}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="app__nav-tab-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="app__content" role="main">
        <div
          id="panel-dashboard"
          role="tabpanel"
          className={`app__panel ${currentView === 'dashboard' ? 'app__panel--active' : ''}`}
          aria-hidden={currentView !== 'dashboard'}
        >
          {currentView === 'dashboard' && <Dashboard />}
        </div>

        <div
          id="panel-csv-import"
          role="tabpanel"
          className={`app__panel ${currentView === 'csv-import' ? 'app__panel--active' : ''}`}
          aria-hidden={currentView !== 'csv-import'}
        >
          {currentView === 'csv-import' && <CSVImport />}
        </div>

        <div
          id="panel-incident-history"
          role="tabpanel"
          className={`app__panel ${currentView === 'incident-history' ? 'app__panel--active' : ''}`}
          aria-hidden={currentView !== 'incident-history'}
        >
          {currentView === 'incident-history' && <IncidentHistory teams={teams} />}
        </div>

        <div
          id="panel-monitor-mapping"
          role="tabpanel"
          className={`app__panel ${currentView === 'monitor-mapping' ? 'app__panel--active' : ''}`}
          aria-hidden={currentView !== 'monitor-mapping'}
        >
          {currentView === 'monitor-mapping' && <MonitorMapping />}
        </div>

        <div
          id="panel-escalation-config"
          role="tabpanel"
          className={`app__panel ${currentView === 'escalation-config' ? 'app__panel--active' : ''}`}
          aria-hidden={currentView !== 'escalation-config'}
        >
          {currentView === 'escalation-config' && <EscalationChainConfig />}
        </div>

        {userPerfil === 'Adm' && (
          <>
            <div
              id="panel-team-management"
              role="tabpanel"
              className={`app__panel ${currentView === 'team-management' ? 'app__panel--active' : ''}`}
              aria-hidden={currentView !== 'team-management'}
            >
              {currentView === 'team-management' && <TeamManagement />}
            </div>

            <div
              id="panel-area-management"
              role="tabpanel"
              className={`app__panel ${currentView === 'area-management' ? 'app__panel--active' : ''}`}
              aria-hidden={currentView !== 'area-management'}
            >
              {currentView === 'area-management' && <AreaManagement />}
            </div>
          </>
        )}

        {(userPerfil === 'Adm' || userPerfil === 'Responsavel') && (
          <div
            id="panel-plantonist-management"
            role="tabpanel"
            className={`app__panel ${currentView === 'plantonist-management' ? 'app__panel--active' : ''}`}
            aria-hidden={currentView !== 'plantonist-management'}
          >
            {currentView === 'plantonist-management' && <PlantonistManagement />}
          </div>
        )}

        {(userPerfil === 'Adm' || userPerfil === 'Responsavel') && (
          <div
            id="panel-periodo-management"
            role="tabpanel"
            className={`app__panel ${currentView === 'periodo-management' ? 'app__panel--active' : ''}`}
            aria-hidden={currentView !== 'periodo-management'}
          >
            {currentView === 'periodo-management' && <PeriodoManagement />}
          </div>
        )}

        {(userPerfil === 'Adm' || userPerfil === 'Responsavel') && (
          <div
            id="panel-escala-management"
            role="tabpanel"
            className={`app__panel ${currentView === 'escala-management' ? 'app__panel--active' : ''}`}
            aria-hidden={currentView !== 'escala-management'}
          >
            {currentView === 'escala-management' && <EscalaManagement />}
          </div>
        )}

        {(userPerfil === 'Adm' || userPerfil === 'Responsavel') && (
          <div
            id="panel-horario-management"
            role="tabpanel"
            className={`app__panel ${currentView === 'horario-management' ? 'app__panel--active' : ''}`}
            aria-hidden={currentView !== 'horario-management'}
          >
            {currentView === 'horario-management' && <HorarioManagement />}
          </div>
        )}

        {(userPerfil === 'Adm' || userPerfil === 'Responsavel') && (
          <div
            id="panel-problema-management"
            role="tabpanel"
            className={`app__panel ${currentView === 'problema-management' ? 'app__panel--active' : ''}`}
            aria-hidden={currentView !== 'problema-management'}
          >
            {currentView === 'problema-management' && <ProblemaManagement />}
          </div>
        )}
      </main>
    </div>
  );
}

/** Connection status indicator for the nav bar */
function ConnectionIndicator({ status }: { status: string }): React.ReactElement {
  const statusLabels: Record<string, string> = {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    reconnecting: 'Reconectando...',
  };

  return (
    <div className="app__connection-status">
      <span className={`app__status-dot app__status-dot--${status}`} />
      <span className="app__status-label">{statusLabels[status] || 'Desconhecido'}</span>
    </div>
  );
}

export default App;
