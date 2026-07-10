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

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

