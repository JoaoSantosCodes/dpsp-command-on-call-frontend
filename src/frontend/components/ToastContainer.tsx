import React, { useEffect } from 'react';
import { useCommandCenterStore } from '../store/command-center-store';
import './ToastContainer.css';

export function ToastContainer(): React.ReactElement | null {
  const toasts = useCommandCenterStore((state) => state.toasts);
  const removeToast = useCommandCenterStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }: { toast: any, onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  return (
    <div className={`toast toast--${toast.type}`}>
      <div className="toast__icon">{icons[toast.type as keyof typeof icons]}</div>
      <div className="toast__content">
        {toast.title && <div className="toast__title">{toast.title}</div>}
        <div className="toast__message">{toast.message}</div>
      </div>
      <button className="toast__close" onClick={onRemove}>&times;</button>
    </div>
  );
}
