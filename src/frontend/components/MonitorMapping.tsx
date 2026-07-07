import React, { useState, useEffect, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './MonitorMapping.css';

interface ProblemaArea { areaCodigo: string; ordem: number; }
interface Problema { id: number; codigo: string; descricao: string; areas: ProblemaArea[]; }
interface AreaInfo { codigo: string; nome: string; coordenadorNome: string | null; gerenteNome: string | null; torre: string | null; }
interface EscalaInfo { plantonista: string; horario: string; data: string; }

export function MonitorMapping(): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const [problemas, setProblemas] = useState<Problema[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [search, setSearch] = useState('');
  const [clock, setClock] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [selectedArea, setSelectedArea] = useState<AreaInfo | null>(null);
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

  // Fetch escalas when area card is clicked
  const handleCardClick = useCallback(async (area: AreaInfo) => {
    setSelectedArea(area);
    setLoadingDetail(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [escRes, usersRes] = await Promise.all([
        fetch(`/api/escalas?areaCodigo=${encodeURIComponent(area.codigo)}`, { headers }),
        fetch(`/api/users?search=`, { headers }),
      ]);

      const escalas = escRes.ok ? await escRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      const users = usersData.users || usersData || [];

      // Get periodos for this area to show dates
      const perRes = await fetch(`/api/periodos?areaCodigo=${encodeURIComponent(area.codigo)}`, { headers });
      const periodos = perRes.ok ? await perRes.json() : [];
      const perList = periodos.periodos || periodos || [];

      // Map escalas to display info
      const today = new Date().toISOString().split('T')[0];
      const mapped: EscalaInfo[] = (escalas.escalas || escalas || []).map((e: any) => {
        const user = users.find((u: any) => u.codigo === e.usuarioCodigo);
        const periodo = perList.find((p: any) => p.codigo === e.periodoCodigo);
        return {
          plantonista: user ? user.nome : e.usuarioCodigo,
          horario: periodo ? periodo.horarios : '—',
          data: periodo ? periodo.data : '—',
        };
      }).sort((a: EscalaInfo, b: EscalaInfo) => a.data.localeCompare(b.data));

      setAreaEscalas(mapped);
    } catch { setAreaEscalas([]); }
    finally { setLoadingDetail(false); }
  }, [token]);

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
        <span className="mapa__header-status"><span className="mapa__header-dot" /> Datadog Conectado</span>
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
              const primaryArea = p.areas.length > 0 ? areas.find(a => a.codigo === p.areas[0].areaCodigo) : null;
              return (
                <div key={p.id} className="mapa__card" onClick={() => { if (primaryArea) handleCardClick(primaryArea); }}>
                  <div className="mapa__card-area">{primaryArea ? primaryArea.nome : '—'}</div>
                  <div className="mapa__card-plantonista">{primaryArea?.coordenadorNome || 'Plantonista'}</div>
                  <div className="mapa__card-problema">P1 - {p.descricao}</div>
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

      {/* Modal de detalhes — Plantonistas cadastrados para o dia */}
      {selectedArea && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setSelectedArea(null)}>
          <div style={{ background: '#0d1b2a', border: '1px solid #1e90ff', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '500px', maxHeight: '70vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#e4e4e7', margin: 0 }}>{selectedArea.nome}</h2>
              <button onClick={() => setSelectedArea(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {selectedArea.coordenadorNome && (
              <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>
                <strong>Coordenador:</strong> {selectedArea.coordenadorNome}
              </div>
            )}
            {selectedArea.gerenteNome && (
              <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '1rem' }}>
                <strong>Gerente:</strong> {selectedArea.gerenteNome}
              </div>
            )}

            <h3 style={{ fontSize: '0.85rem', color: '#818cf8', marginBottom: '0.75rem' }}>Plantonistas escalados</h3>

            {loadingDetail ? (
              <div style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Carregando...</div>
            ) : areaEscalas.length === 0 ? (
              <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>⚠ Nenhum plantonista escalado para esta área</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {areaEscalas.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#e4e4e7', fontWeight: 500 }}>👤 {e.plantonista}</span>
                    <span style={{ fontSize: '0.75rem', color: '#818cf8' }}>🕐 {e.horario}</span>
                    <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>📅 {e.data}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MonitorMapping;
