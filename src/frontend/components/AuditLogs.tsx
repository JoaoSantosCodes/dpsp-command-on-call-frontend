import React, { useEffect, useState } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './AuditLogs.css';

interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  resource: string;
  details: string | null;
  created_at: string;
}

export function AuditLogs(): React.ReactElement {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useCommandCenterStore((state) => state.token);

  useEffect(() => {
    fetchLogs();
  }, [token]);

  async function fetchLogs() {
    try {
      setLoading(true);
      const res = await fetch('/api/audit-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  return (
    <div className="audit-logs">
      <div className="audit-logs__header">
        <h2>Histórico de Auditoria</h2>
        <button onClick={fetchLogs} className="audit-logs__refresh-btn">🔄 Atualizar</button>
      </div>

      <div className="audit-logs__content">
        {loading ? (
          <div className="audit-logs__loading">Carregando logs...</div>
        ) : (
          <table className="audit-logs__table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Recurso</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="audit-logs__empty">Nenhum registro encontrado.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>{log.username}</td>
                    <td><span className={`audit-tag audit-tag--${log.action.toLowerCase()}`}>{log.action}</span></td>
                    <td>{log.resource}</td>
                    <td>{log.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AuditLogs;
