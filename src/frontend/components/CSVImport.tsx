import React, { useState, useRef, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './CSVImport.css';

type ImportStatus = 'idle' | 'uploading' | 'success' | 'error';
type ActiveTab = 'importar' | 'exportar-escala' | 'exportar-cobertura';

interface ImportResponse {
  success: boolean;
  areas?: Array<{ nome: string; colaboradores: number }>;
  totalEntries?: number;
  areasCreated?: number;
  usersCreated?: number;
  usersUpdated?: number;
  periodosCreated?: number;
  escalasCreated?: number;
  errors?: string[];
}

export function CSVImport(): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<ActiveTab>('importar');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStatus('idle'); setFileName(null); setResult(null); setErrorMsg(null);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setStatus('uploading'); setFileName(file.name); setResult(null); setErrorMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('/api/escalation/import', { method: 'POST', headers, body: formData });
      const data: ImportResponse = await response.json();
      if (response.ok && data.success) { setStatus('success'); setResult(data); }
      else { setStatus('error'); setErrorMsg(data.errors?.join(', ') || 'Erro ao importar'); }
    } catch { setStatus('error'); setErrorMsg('Erro de conexão'); }
  }, [token]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) uploadFile(file);
    else { setStatus('error'); setErrorMsg('Apenas arquivos .csv, .xlsx ou .xls'); }
  }, [uploadFile]);

  // === EXPORT FUNCTIONS ===

  const exportEscala = useCallback(async () => {
    setExportLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [areasRes, usersRes, escalasRes, periodosRes] = await Promise.all([
        fetch('/api/areas/public'),
        fetch('/api/users', { headers }),
        fetch('/api/escalas', { headers }),
        fetch('/api/periodos', { headers }),
      ]);

      const areas = areasRes.ok ? await areasRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      const escalas = escalasRes.ok ? await escalasRes.json() : [];
      const periodos = periodosRes.ok ? await periodosRes.json() : [];

      const areaList = areas.areas || areas || [];
      const userList = usersData.users || usersData || [];
      const escalaList = escalas.escalas || escalas || [];
      const periodoList = periodos.periodos || periodos || [];

      // Build CSV: Area | Plantonista | Cargo | Horário | Data
      let csv = 'Área,Plantonista,Cargo,Horário,Data\n';
      for (const escala of escalaList) {
        const area = areaList.find((a: any) => a.codigo === escala.areaCodigo);
        const user = userList.find((u: any) => u.codigo === escala.usuarioCodigo);
        const periodo = periodoList.find((p: any) => p.codigo === escala.periodoCodigo);
        csv += `"${area?.nome || escala.areaCodigo}","${user?.nome || escala.usuarioCodigo}","${user?.cargo || ''}","${periodo?.horarios || ''}","${periodo?.data || ''}"\n`;
      }

      downloadCSV(csv, `escalonamento_${new Date().toISOString().split('T')[0]}.csv`);
    } catch { setErrorMsg('Erro ao exportar'); }
    finally { setExportLoading(false); }
  }, [token]);

  const exportCobertura = useCallback(async () => {
    setExportLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [areasRes, periodosRes, escalasRes] = await Promise.all([
        fetch('/api/areas/public'),
        fetch('/api/periodos', { headers }),
        fetch('/api/escalas', { headers }),
      ]);

      const areaList = (areasRes.ok ? await areasRes.json() : []).areas || (areasRes.ok ? await areasRes.json() : []) || [];
      const periodoList = (periodosRes.ok ? await periodosRes.json() : []).periodos || (periodosRes.ok ? await periodosRes.json() : []) || [];
      const escalaList = (escalasRes.ok ? await escalasRes.json() : []).escalas || (escalasRes.ok ? await escalasRes.json() : []) || [];

      // Refetch properly
      const areas2 = await (await fetch('/api/areas/public')).json();
      const periodos2 = await (await fetch('/api/periodos', { headers })).json();
      const escalas2 = await (await fetch('/api/escalas', { headers })).json();
      const areas = areas2.areas || areas2 || [];
      const periodos = periodos2.periodos || periodos2 || [];
      const escalas = escalas2.escalas || escalas2 || [];

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const daysInMonth = new Date(year, month, 0).getDate();

      let csv = 'Área,Dias Cobertos,Dias Descobertos,Total Dias,Cobertura %\n';
      for (const area of areas) {
        if (area.codigo === 'PENDENTE_APROVACAO') continue;
        const areaPeriodos = periodos.filter((p: any) => p.areaCodigo === area.codigo);
        const areaEscalas = escalas.filter((e: any) => e.areaCodigo === area.codigo);
        const coveredDays = new Set<string>();
        for (const esc of areaEscalas) {
          const per = areaPeriodos.find((p: any) => p.codigo === esc.periodoCodigo);
          if (per && per.data) coveredDays.add(per.data);
        }
        const covered = coveredDays.size;
        const pct = daysInMonth > 0 ? Math.round((covered / daysInMonth) * 100) : 0;
        csv += `"${area.nome}",${covered},${daysInMonth - covered},${daysInMonth},${pct}%\n`;
      }

      downloadCSV(csv, `cobertura_${year}-${String(month).padStart(2, '0')}.csv`);
    } catch { setErrorMsg('Erro ao exportar cobertura'); }
    finally { setExportLoading(false); }
  }, [token]);

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="csv-import">
      <h2 className="csv-import__title">Importação & Exportação</h2>

      {/* Tabs */}
      <div className="csv-import__tabs">
        <button className={`csv-import__tab ${activeTab === 'importar' ? 'csv-import__tab--active' : ''}`} onClick={() => { setActiveTab('importar'); resetState(); }}>
          📥 Importar CSV
        </button>
        <button className={`csv-import__tab ${activeTab === 'exportar-escala' ? 'csv-import__tab--active' : ''}`} onClick={() => setActiveTab('exportar-escala')}>
          📤 Exportar Escala
        </button>
        <button className={`csv-import__tab ${activeTab === 'exportar-cobertura' ? 'csv-import__tab--active' : ''}`} onClick={() => setActiveTab('exportar-cobertura')}>
          📊 Exportar Cobertura
        </button>
      </div>

      {/* IMPORTAR TAB */}
      {activeTab === 'importar' && (
        <div className="csv-import__section">
          <p className="csv-import__subtitle">Importe o CSV de escalonamento para cadastrar áreas, colaboradores e escalas automaticamente.</p>

          <div className="csv-import__actions">
            <button className="csv-import__template-btn" onClick={() => window.open('/api/escalation/template', '_blank')}>
              📥 Baixar Template
            </button>
          </div>

          <div
            className={`csv-import__dropzone ${isDragOver ? 'csv-import__dropzone--drag-over' : ''} ${status === 'uploading' ? 'csv-import__dropzone--uploading' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button" tabIndex={0}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileSelect} />
            {status === 'uploading' ? (
              <span>Processando...</span>
            ) : (
              <><span className="csv-import__dropzone-icon">📄</span><span>Arraste o CSV ou Excel (.xlsx) aqui ou clique para selecionar</span></>
            )}
          </div>

          {fileName && <div className="csv-import__file-name">Arquivo: <strong>{fileName}</strong></div>}

          {status === 'success' && result && (
            <div className="csv-import__result csv-import__result--success">
              <span>✓ Importação realizada com sucesso!</span>
              <ul>
                <li>Áreas encontradas: <strong>{result.areas?.length || 0}</strong></li>
                <li>Entradas de escala: <strong>{result.totalEntries}</strong></li>
                <li>Áreas criadas: <strong>{result.areasCreated || 0}</strong></li>
                <li>Usuários criados: <strong>{result.usersCreated || 0}</strong></li>
                {(result.usersUpdated || 0) > 0 && <li>Usuários atualizados (de-para): <strong>{result.usersUpdated}</strong></li>}
                <li>Períodos criados: <strong>{result.periodosCreated || 0}</strong></li>
                <li>Escalas criadas: <strong>{result.escalasCreated || 0}</strong></li>
              </ul>
            </div>
          )}

          {status === 'error' && <div className="csv-import__result csv-import__result--error">✗ {errorMsg}</div>}
          {status !== 'idle' && status !== 'uploading' && (
            <button className="csv-import__reset-btn" onClick={resetState}>Nova importação</button>
          )}
        </div>
      )}

      {/* EXPORTAR ESCALA TAB */}
      {activeTab === 'exportar-escala' && (
        <div className="csv-import__section">
          <p className="csv-import__subtitle">Exportar o mapa de escalonamento vigente em CSV. Inclui área, plantonista, cargo, horário e data.</p>
          <div className="csv-import__export-card">
            <div className="csv-import__export-info">
              <strong>Escalonamento Completo</strong>
              <span>Formato: CSV (compatível com Excel)</span>
              <span>Conteúdo: Todas as escalas cadastradas com plantonista, horário e data</span>
            </div>
            <button className="csv-import__export-btn" onClick={exportEscala} disabled={exportLoading}>
              {exportLoading ? 'Gerando...' : '📤 Exportar CSV'}
            </button>
          </div>
        </div>
      )}

      {/* EXPORTAR COBERTURA TAB */}
      {activeTab === 'exportar-cobertura' && (
        <div className="csv-import__section">
          <p className="csv-import__subtitle">Relatório de cobertura mensal — mostra dias cobertos e descobertos por área.</p>
          <div className="csv-import__export-card">
            <div className="csv-import__export-info">
              <strong>Relatório de Cobertura</strong>
              <span>Formato: CSV (compatível com Excel)</span>
              <span>Conteúdo: Área | Dias Cobertos | Dias Descobertos | % Cobertura</span>
            </div>
            <button className="csv-import__export-btn" onClick={exportCobertura} disabled={exportLoading}>
              {exportLoading ? 'Gerando...' : '📊 Exportar Cobertura'}
            </button>
          </div>
        </div>
      )}

      {errorMsg && activeTab !== 'importar' && (
        <div className="csv-import__result csv-import__result--error">{errorMsg}</div>
      )}
    </div>
  );
}

export default CSVImport;
