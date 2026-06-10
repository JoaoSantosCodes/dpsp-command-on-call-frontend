import React, { useState, useRef, useCallback } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './CSVImport.css';

/**
 * CSVImport component — imports escalation CSV (area → collaborators → days).
 * Auto-creates areas and users from the CSV data.
 * Supports drag-and-drop or file selector for uploading.
 *
 * Validates: Requirements 4.1, 4.3, 4.4
 */

type ImportStatus = 'idle' | 'uploading' | 'success' | 'error';

interface EscalationImportResponse {
  success: boolean;
  areas?: Array<{ nome: string; colaboradores: number }>;
  totalEntries?: number;
  areasCreated?: number;
  usersCreated?: number;
  usersUpdated?: number;
  errors?: string[];
}

export function CSVImport(): React.ReactElement {
  const token = useCommandCenterStore((state) => state.token);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<EscalationImportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStatus('idle');
    setFileName(null);
    setResult(null);
    setErrorMsg(null);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setStatus('uploading');
    setFileName(file.name);
    setResult(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/escalation/import', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data: EscalationImportResponse = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setErrorMsg(data.errors?.join(', ') || 'Erro ao importar arquivo');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Erro de conexão com o servidor');
    }
  }, [token]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadFile]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      uploadFile(file);
    } else {
      setStatus('error');
      setErrorMsg('Apenas arquivos .csv são aceitos');
    }
  }, [uploadFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    window.open('/api/escalation/template', '_blank');
  }, []);

  return (
    <div className="csv-import">
      <h2 className="csv-import__title">Importar Escalonamento CSV</h2>
      <p className="csv-import__subtitle">
        Importe o CSV de escalonamento para cadastrar áreas, colaboradores e escalas automaticamente.
      </p>

      <div className="csv-import__actions">
        <button className="csv-import__template-btn" onClick={handleDownloadTemplate}>
          📥 Baixar Template
        </button>
      </div>

      <div
        className={`csv-import__dropzone ${isDragOver ? 'csv-import__dropzone--drag-over' : ''} ${status === 'uploading' ? 'csv-import__dropzone--uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Área de upload de arquivo CSV"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="csv-import__file-input"
          onChange={handleFileSelect}
          aria-hidden="true"
        />
        {status === 'uploading' ? (
          <span className="csv-import__uploading-text">Processando...</span>
        ) : (
          <>
            <span className="csv-import__dropzone-icon">📄</span>
            <span className="csv-import__dropzone-text">
              Arraste o CSV de escalonamento aqui ou clique para selecionar
            </span>
          </>
        )}
      </div>

      {fileName && status !== 'idle' && (
        <div className="csv-import__file-name">Arquivo: <strong>{fileName}</strong></div>
      )}

      {status === 'success' && result && (
        <div className="csv-import__result csv-import__result--success">
          <span className="csv-import__result-icon">✓</span>
          <div className="csv-import__result-details">
            <span className="csv-import__result-title">Importação realizada com sucesso!</span>
            <ul className="csv-import__result-list">
              <li>Áreas encontradas: <strong>{result.areas?.length || 0}</strong></li>
              <li>Entradas de escala: <strong>{result.totalEntries}</strong></li>
              <li>Áreas criadas: <strong>{result.areasCreated || 0}</strong></li>
              <li>Usuários criados: <strong>{result.usersCreated || 0}</strong></li>
              <li>Usuários atualizados: <strong>{result.usersUpdated || 0}</strong></li>
            </ul>
            {result.areas && result.areas.length > 0 && (
              <div className="csv-import__areas-summary">
                <h4>Áreas importadas:</h4>
                <ul>
                  {result.areas.map((a, i) => (
                    <li key={i}>{a.nome} — {a.colaboradores} colaboradores</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="csv-import__result csv-import__result--error">
          <span className="csv-import__result-icon">✗</span>
          <div className="csv-import__result-details">
            <span className="csv-import__result-title">Falha na importação</span>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {status !== 'idle' && status !== 'uploading' && (
        <button className="csv-import__reset-btn" onClick={resetState}>Nova importação</button>
      )}
    </div>
  );
}

export default CSVImport;
