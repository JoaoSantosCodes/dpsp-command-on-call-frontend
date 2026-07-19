import React, { useState } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import type { AppView } from '../../shared/types';
import './Sidebar.css';

interface NavItem {
  id: AppView;
  label: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { id: 'monitor-mapping', label: 'Mapa', icon: '🗺️' },
  { id: 'area-management', label: 'Áreas', icon: '🏢' },
  { id: 'plantonist-management', label: 'Plantonistas', icon: '👥' },
  { id: 'escalation-view', label: 'Sobreaviso', icon: '📋' },
  { id: 'escala-management', label: 'Escalas', icon: '📅' },
  { id: 'horario-management', label: 'Horários', icon: '🕐' },
  { id: 'csv-import', label: 'Importar', icon: '📥' },
  { id: 'problema-management', label: 'Problemas', icon: '⚠️' },
  { id: 'user-management', label: 'Usuários', icon: '👤' },
  { id: 'audit-logs', label: 'Auditoria', icon: '🛡️' },
  { id: 'relatorio-contato', label: 'Relatórios', icon: '📊' },
];

const RESPONSAVEL_NAV: NavItem[] = [
  { id: 'monitor-mapping', label: 'Mapa', icon: '🗺️' },
  { id: 'plantonist-management', label: 'Plantonistas', icon: '👥' },
  { id: 'escalation-view', label: 'Sobreaviso', icon: '📋' },
  { id: 'escala-management', label: 'Escalas', icon: '📅' },
  { id: 'horario-management', label: 'Horários', icon: '🕐' },
  { id: 'relatorio-contato', label: 'Relatórios', icon: '📊' },
];

const PLANTONISTA_NAV: NavItem[] = [
  { id: 'monitor-mapping', label: 'Mapa', icon: '🗺️' },
  { id: 'escalation-view', label: 'Sobreaviso', icon: '📋' },
  { id: 'relatorio-contato', label: 'Relatórios', icon: '📊' },
];

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps): React.ReactElement {
  const user = useCommandCenterStore((state) => state.user);
  const logout = useCommandCenterStore((state) => state.logout);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = user?.perfil === 'Adm' ? ADMIN_NAV
    : user?.perfil === 'Responsavel' ? RESPONSAVEL_NAV
    : PLANTONISTA_NAV;

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__logo">
        <span className="sidebar__logo-icon">🛡️</span>
        {!collapsed && <span className="sidebar__logo-text">Command Center</span>}
        <button className="sidebar__toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Recolher'}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__nav-item ${currentView === item.id ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar__nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__user-avatar">
            {user?.nome?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.nome || 'Usuário'}</span>
              <span className="sidebar__user-role">{user?.perfil || ''}</span>
            </div>
          )}
        </div>
        <button className="sidebar__theme-toggle" onClick={() => {
          const current = document.documentElement.getAttribute('data-theme') || 'dark';
          const next = current === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('theme', next);
        }} title="Alternar tema">
          🌓
        </button>
        <button className="sidebar__logout" onClick={logout} title="Sair">
          🚪
        </button>
      </div>
    </aside>
  );
}
