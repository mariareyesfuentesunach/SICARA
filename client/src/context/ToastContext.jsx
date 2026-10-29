import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          let bg = 'bg-white border-app-border text-app-text';
          let icon = <Info className="w-5 h-5 text-vino-primary shrink-0" />;

          if (toast.type === 'success') {
            bg = 'bg-white border-l-4 border-status-success text-app-text';
            icon = <CheckCircle className="w-5 h-5 text-status-success shrink-0" />;
          } else if (toast.type === 'error') {
            bg = 'bg-white border-l-4 border-status-error text-app-text';
            icon = <AlertCircle className="w-5 h-5 text-status-error shrink-0" />;
          } else if (toast.type === 'warning') {
            bg = 'bg-white border-l-4 border-status-warning text-app-text';
            icon = <AlertTriangle className="w-5 h-5 text-status-warning shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-subtle shadow-card border border-app-border ${bg} animate-fade-in transition-all`}
            >
              {icon}
              <div className="flex-1 text-sm font-medium leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-app-muted hover:text-app-text transition-colors p-0.5 rounded"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}
