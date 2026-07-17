import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './frontend/App';

// Intercept relative /api/ calls and prepend VITE_API_URL if configured
const apiBase = (import.meta as any).env.VITE_API_URL || '';
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${apiBase}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ff5555', padding: '20px', background: '#1e1e1e', height: '100vh', fontFamily: 'monospace' }}>
          <h2>Algo deu errado no React! (Erro JS)</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
