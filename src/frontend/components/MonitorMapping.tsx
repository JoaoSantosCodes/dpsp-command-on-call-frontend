import React, { useState, useEffect, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './MonitorMapping.css';

interface ProblemaArea { areaCodigo: string; ordem: number; }
interface Problema { id: number; codigo: string; descricao: string; areas: ProblemaArea[]; }
interface AreaInfo { codigo: string; nome: string; coordenadorNome: string | null; coordenadorContato: string | null; gerenteNome: string | null; gerenteContato: string | null; torre: string | null; }
interface EscalaInfo { plantonista: string; contato: string; horario: string; data: string; areaCodigo: string; nivel: string; statusContato?: string; }

export function MonitorMapping(): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const [problemas, setProblemas] = useState<Problema[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [search, setSearch] = useState('');
  const [clock, setClock] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [selectedArea, setSelectedArea] = useState<AreaInfo | null>(null);
  const [selectedProblema, setSelectedProblema] = useState<Problema | null>(null);
  const [areaEscalas, setAreaEscalas] = useState<EscalaInfo[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const [pRes, aRes] = await Promise.all([fetch('/api/problemas', { headers }), fetch('/api/areas/public')]);
      if (pRes.ok) setProblemas(await pRes.json());
      if (aRes.ok) { const d = await aRes.json(); setAreas(d.areas || d || []); }
    } catch {}
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getAreaNome = (c: string) => areas.find(a => a.codigo === c)?.nome || c;

  // Fetch escalas when card is clicked (for all areas of the problem)
  const handleCardClick = useCallback(async (problema: Problema) => {
    const primaryArea = areas.find(a => a.codigo === problema.areas[0]?.areaCodigo) || null;
    setSelectedArea(primaryArea);
    setSelectedProblema(problema);
    setLoadingDetail(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Fetch users and escalas for ALL areas of this problem
      const usersRes = await fetch('/api/users?search=', { headers });
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      const users = usersData.users || usersData || [];

      const allEscalas: EscalaInfo[] = [];
      // Get today's date in Brasilia timezone (YYYY-MM-DD)
      const now = new Date();
      const brasiliaStr = now.toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const today = brasiliaStr.split(',')[0].trim(); // "2026-07-08"

      for (const pa of problema.areas) {
        const [escRes, perRes] = await Promise.all([
          fetch(`/api/escalas?areaCodigo=${encodeURIComponent(pa.areaCodigo)}`, { headers }),
          fetch(`/api/periodos?areaCodigo=${encodeURIComponent(pa.areaCodigo)}`, { headers }),
        ]);
        const escalas = escRes.ok ? await escRes.json() : [];
        const periodos = perRes.ok ? await perRes.json() : [];
        const escList = escalas.escalas || escalas || [];
        const perList = periodos.periodos || periodos || [];

        for (const e of escList) {
          const periodo = perList.find((p: any) => p.codigo === e.periodoCodigo);
          // Only show today's plantonista
          if (periodo && periodo.data !== today) continue;
          const user = users.find((u: any) => u.codigo === e.usuarioCodigo);
          allEscalas.push({
            plantonista: user ? user.nome : e.usuarioCodigo,
            contato: user?.contato || '—',
            horario: periodo ? periodo.horarios : '—',
            data: periodo ? periodo.data : '—',
            areaCodigo: pa.areaCodigo,
            nivel: user?.nivelEscalonamento || '—',
          });
        }
      }

      setAreaEscalas(allEscalas.sort((a, b) => a.data.localeCompare(b.data)));
    } catch { setAreaEscalas([]); }
    finally { setLoadingDetail(false); }
  }, [token, areas]);

  const filtered = problemas.filter(p => {
    if (filterArea && !p.areas.some(a => a.areaCodigo === filterArea)) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.descricao.toLowerCase().includes(s) || p.codigo.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="mapa">
      <div className="mapa__header">
        <span className="mapa__header-title">Command Center</span>
        <span className="mapa__header-clock">● {clock}</span>
      </div>

      <div className="mapa__search">
        <input className="mapa__search-input" type="text" placeholder="🔍 Buscar monitor..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mapa__container">
        {problemas.length === 0 ? (
          <div className="mapa__empty">Nenhum alerta carregado</div>
        ) : (
          <div className="mapa__grid">
            {problemas.filter(p => {
              if (filterArea && !p.areas.some(a => a.areaCodigo === filterArea)) return false;
              if (search) {
                const s = search.toLowerCase();
                return p.descricao.toLowerCase().includes(s) || p.codigo.toLowerCase().includes(s);
              }
              return true;
            }).map((p) => {
              const sortedAreas = [...p.areas].sort((a, b) => a.ordem - b.ordem);
              const primaryArea = sortedAreas.length > 0 ? areas.find(a => a.codigo === sortedAreas[0].areaCodigo) : null;
              return (
                <div key={p.id} className="mapa__card" onClick={() => handleCardClick(p)}>
                  <div className="mapa__card-area">{primaryArea ? primaryArea.nome : '—'}</div>
                  <div className="mapa__card-plantonista">{primaryArea?.coordenadorNome || 'Plantonista'}</div>
                  <div className="mapa__card-problema">P1 - {p.descricao}</div>
                  {sortedAreas.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.2rem' }}>
                      {sortedAreas.slice(1).map((a) => (
                        <span key={a.areaCodigo} style={{ fontSize: '0.55rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                          {a.ordem}º {getAreaNome(a.areaCodigo)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mapa__bottom-bar">
        {areas.filter(a => a.codigo !== 'PENDENTE_APROVACAO').map((a) => (
          <div key={a.codigo} className="mapa__area-chip" onClick={() => setFilterArea(filterArea === a.codigo ? '' : a.codigo)} style={filterArea === a.codigo ? { background: 'rgba(30,144,255,0.3)', borderColor: '#1e90ff' } : {}}>
            {a.nome}
          </div>
        ))}
      </div>

      {/* Modal de detalhes — Todas as áreas responsáveis + plantonistas */}
      {selectedArea && selectedProblema && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => { setSelectedArea(null); setSelectedProblema(null); }}>
          <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '550px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', color: 'var(--page-text)', margin: 0 }}>{selectedProblema.descricao}</h2>
              <button onClick={() => { setSelectedArea(null); setSelectedProblema(null); }} style={{ background: 'none', border: 'none', color: 'var(--error-text)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <h3 style={{ fontSize: '0.8rem', color: '#818cf8', marginBottom: '0.5rem' }}>Áreas Responsáveis (ordem de acionamento)</h3>

            {selectedProblema.areas.sort((a, b) => a.ordem - b.ordem).map((pa) => {
              const area = areas.find(a => a.codigo === pa.areaCodigo);
              // Filter plantonistas for THIS area
              const areaPlants = areaEscalas.filter(e => {
                // Match by area - we need to tag escalas with areaCodigo
                return true; // will fix below
              });
              return (
                <div key={pa.areaCodigo} style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--badge-indigo-text)' }}>{pa.ordem}º</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--page-text)', fontWeight: 600 }}>{area?.nome || pa.areaCodigo}</span>
                  </div>
                  {area?.coordenadorNome && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--page-text-muted)', marginBottom: '0.2rem' }}>
                      Coordenador: {area.coordenadorNome} {area.coordenadorContato && <span style={{ color: 'var(--badge-green-text)' }}>📞 {area.coordenadorContato}</span>}
                    </div>
                  )}
                  {area?.gerenteNome && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--page-text-muted)', marginBottom: '0.5rem' }}>
                      Gerente: {area.gerenteNome} {area.gerenteContato && <span style={{ color: 'var(--badge-green-text)' }}>📞 {area.gerenteContato}</span>}
                    </div>
                  )}

                  {/* Plantonistas desta área */}
                  {!loadingDetail && areaEscalas.filter(e => e.areaCodigo === pa.areaCodigo).length > 0 ? (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Plantonistas</div>
                      {areaEscalas.filter(e => e.areaCodigo === pa.areaCodigo).map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-bg)', border: '1px solid var(--success-border)', padding: '0.4rem 0.6rem', borderRadius: '6px', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--badge-yellow-text)', fontWeight: 600 }}>{e.nivel}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--page-text)', fontWeight: 500 }}>👤 {e.plantonista}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--badge-green-text)' }}>📞 {e.contato}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--badge-indigo-text)' }}>🕐 {e.horario}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--page-text-muted)' }}>📅 {e.data}</span>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', width: '100%', marginTop: '0.3rem' }}>
                            <select
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', cursor: 'pointer' }}
                              defaultValue={e.statusContato || 'pendente'}
                              onChange={async (ev) => {
                                const status = ev.target.value;
                                const obsInput = document.getElementById(`obs-${i}-${pa.areaCodigo}`) as HTMLInputElement;
                                const observacao = obsInput?.value || '';
                                try {
                                  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                                  if (token) headers['Authorization'] = `Bearer ${token}`;
                                  await fetch('/api/contato-log', { method: 'POST', headers, body: JSON.stringify({ plantonista: e.plantonista, areaCodigo: e.areaCodigo, problemaCodigo: selectedProblema?.codigo, data: e.data, status, observacao }) });
                                  e.statusContato = status;
                                } catch {}
                              }}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="atendido">Atendido</option>
                              <option value="nao_atendido">Não Atendido</option>
                            </select>
                            <input id={`obs-${i}-${pa.areaCodigo}`} type="text" placeholder="Obs..." style={{ flex: 1, fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !loadingDetail && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#f59e0b' }}>⚠ Sem plantonista escalado para esta área</div>
                  )}
                </div>
              );
            })}

            <h3 style={{ fontSize: '0.8rem', color: '#818cf8', margin: '1rem 0 0.5rem' }}>Plantonistas escalados</h3>

            {loadingDetail && (
              <div style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Carregando...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MonitorMapping;
