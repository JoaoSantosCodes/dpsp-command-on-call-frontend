import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useCommandCenterStore } from './store/command-center-store';
import { Dashboard } from './components/Dashboard';
import { CSVImport } from './components/CSVImport';
import { IncidentHistory } from './components/IncidentHistory';
import { MonitorMapping } from './components/MonitorMapping';
import { Sidebar } from './components/Sidebar';
import { EscalationView } from './components/EscalationView';
import { EscalationChainConfig } from './components/EscalationChainConfig';
import { AreaManagement } from './components/AreaManagement';
import { PlantonistManagement } from './components/PlantonistManagement';
import { PeriodoManagement } from './components/PeriodoManagement';
import { EscalaManagement } from './components/EscalaManagement';
import { HorarioManagement } from './components/HorarioManagement';
import { ProblemaManagement } from './components/ProblemaManagement';
import { TeamManagement } from './components/TeamManagement';
import { UserManagement } from './components/UserManagement';
import { RelatorioContato } from './components/RelatorioContato';
import { Login } from './components/Login';
import { RegisterUser } from './components/RegisterUser';
import { AreaSelector } from './components/AreaSelector';
import { SetupWizard } from './components/SetupWizard';
import { AuditLogs } from './components/AuditLogs';
import './App.css';

import type { AppView } from '../shared/types';

/**
 * Main navigation views accessible once authenticated.
 */
type AuthenticatedView = 'dashboard' | 'csv-import' | 'incident-history' | 'monitor-mapping' | 'escalation-config' | 'area-management' | 'plantonist-management' | 'periodo-management' | 'escala-management' | 'escalation-view' | 'horario-management' | 'problema-management' | 'team-management' | 'user-management' | 'relatorio-contato';

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
 * Authenticated portion of the app with WebSocket and sidebar navigation.
 */
function AuthenticatedApp({
  currentView,
  setCurrentView,
}: {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}): React.ReactElement {
  useWebSocket();

  const teams = useCommandCenterStore((state) => state.teams);
  const connectionStatus = useCommandCenterStore((state) => state.connectionStatus);
  const userPerfil = useCommandCenterStore((state) => state.user?.perfil);

  const [clock, setClock] = useState('');

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);

  return (
    <div className="app-layout">
      <Sidebar currentView={currentView} onNavigate={(v) => setCurrentView(v)} />

      <div className="app-layout__content">
        <header className="app-layout__header">
          <span className="app-layout__clock">{clock}</span>
          <span className="app-layout__status">
            <span className={`app-layout__status-dot ${connectionStatus !== 'connected' ? 'app-layout__status-dot--disconnected' : ''}`} />
            {connectionStatus === 'connected' ? 'Online' : 'Offline'}
          </span>
          <button className="app__theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Alternar tema" style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </header>

        <main style={{ padding: '0' }}>
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'csv-import' && <CSVImport />}
          {currentView === 'incident-history' && <IncidentHistory teams={teams} />}
          {currentView === 'monitor-mapping' && <MonitorMapping />}
          {currentView === 'escalation-config' && <EscalationChainConfig />}
          {(currentView as string) === 'escalation-view' && <EscalationView />}
          {currentView === 'area-management' && <AreaManagement />}
          {currentView === 'plantonist-management' && <PlantonistManagement />}
          {currentView === 'escala-management' && <EscalaManagement />}
          {currentView === 'horario-management' && <HorarioManagement />}
          {currentView === 'problema-management' && <ProblemaManagement />}
          {currentView === 'user-management' && <UserManagement />}
          {currentView === 'relatorio-contato' && <RelatorioContato />}
          {currentView === 'audit-logs' && <AuditLogs />}
        </main>
      </div>
    </div>
  );
}

export default App;
