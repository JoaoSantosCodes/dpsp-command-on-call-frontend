import React, { useState, useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './MonitorDetailModal.css';

interface MonitorDetail {
  id: number;
  name: string;
  message?: string;
  query?: string;
  type?: string;
  tags?: string[];
  overall_state?: string;
  teamId?: string;
}

interface Props {
  monitorId: number;
  monitorName: string;
  onClose: () => void;
}

interface Responsible {
  area: string;
  isPrimary: boolean;
  isDevOps: boolean;
  plantonistas: Array<{ nome: string; contato: string; cargo: string; nivel: string; horarioInicio: string; horarioFim: string; is24h: boolean }>;
}

export function MonitorDetailModal({ monitorId, monitorName, onClose }: Props): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const [detail, setDetail] = useState<MonitorDetail | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/monitors/${monitorId}`, { headers });
        if (!res.ok) { setError('Erro ao carregar detalhes'); return; }
        const data = await res.json();
        setDetail(data);

        try {
          const respRes = await fetch(`/api/monitors/${monitorId}/responsible`, { headers });
          if (respRes.ok) {
            const respData = await respRes.json();
            setAreaName(respData.primaryArea);
            setResponsibles(respData.responsibles || []);
          }
        } catch { /* silent */ }
      } catch {
        setError('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [monitorId, token]);

  const handleAcionar = (nome: string, contato: string, area: string) => {
    if (!contato) {
      useCommandCenterStore.getState().addToast({ type: 'warning', message: 'Contato não disponível para este plantonista' });
      return;
    }
    const phone = '55' + contato.replace(/[^0-9]/g, '');
    const monitorLink = `https://app.datadoghq.com/monitors/${monitorId}`;
    const message = encodeURIComponent(
      `🚨 *Alerta Detectado*\n\n📋 Monitor: ${monitorName}\n🔗 Link: ${monitorLink}\n\n🏢 Área: ${area}\n👤 Plantonista: ${nome}\n\n⏳ Aguardando resposta do plantonista.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="monitor-modal-overlay" onClick={onClose}>
      <div className="monitor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="monitor-modal__header">
          <h2 className="monitor-modal__title">{monitorName}</h2>
          <button className="monitor-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="monitor-modal__body">
          {loading && <div className="monitor-modal__loading">Carregando...</div>}
          
          {error && <div className="monitor-modal__error">{error}</div>}

          {detail && !loading && (
            <>
              <div className="monitor-modal__section">
                <label>Status</label>
                <span className={`monitor-modal__status monitor-modal__status--${(detail.overall_state || 'unknown').toLowerCase()}`}>
                  {detail.overall_state || 'Desconhecido'}
                </span>
              </div>

              {areaName && (
                <div className="monitor-modal__section">
                  <label>Área Responsável</label>
                  <span className="monitor-modal__area">{areaName}</span>
                </div>
              )}

              {detail.type && (
                <div className="monitor-modal__section">
                  <label>Tipo</label>
                  <span>{detail.type}</span>
                </div>
              )}

              {detail.query && (
                <div className="monitor-modal__section">
                  <label>Query</label>
                  <pre className="monitor-modal__code">{detail.query}</pre>
                </div>
              )}

              {detail.message && (
                <div className="monitor-modal__section">
                  <label>Template / Mensagem</label>
                  <pre className="monitor-modal__template">{detail.message}</pre>
                </div>
              )}

              {detail.tags && detail.tags.length > 0 && (
                <div className="monitor-modal__section">
                  <label>Tags</label>
                  <div className="monitor-modal__tags">
                    {detail.tags.map((tag, i) => (
                      <span key={i} className="monitor-modal__tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Acionamento por área */}
              {responsibles.length > 0 && (
                <div className="monitor-modal__actions">
                  {responsibles.map((resp, i) => (
                    <div key={i} className="monitor-modal__area-group">
                      <div className="monitor-modal__area-header">
                        {resp.isDevOps ? '⚙️' : '📋'} {resp.area}
                      </div>
                      {resp.plantonistas.length > 0 ? (
                        <div className="monitor-modal__escalation-list">
                          {resp.plantonistas.map((p, j) => (
                            <div key={j} className="monitor-modal__escalation-item">
                              <div className="monitor-modal__escalation-info">
                                <span className="monitor-modal__escalation-nivel">{p.nivel || 'Plantonista'}</span>
                                <span className="monitor-modal__escalation-nome">{p.nome}</span>
                                <span className="monitor-modal__escalation-time">{p.is24h ? '24h' : `${p.horarioInicio} → ${p.horarioFim}`}</span>
                              </div>
                              <button
                                className="monitor-modal__escalation-btn"
                                onClick={() => handleAcionar(p.nome, p.contato, resp.area)}
                                disabled={!p.contato}
                                title={p.contato ? `WhatsApp: ${p.contato}` : 'Sem contato'}
                              >
                                📱 Acionar
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="monitor-modal__no-plantonista">Sem plantonista hoje</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonitorDetailModal;
