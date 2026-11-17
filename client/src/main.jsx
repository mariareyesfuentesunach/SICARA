import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { OfflineProvider } from './context/OfflineContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <OfflineProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </OfflineProvider>
    </ToastProvider>
  </React.StrictMode>
);

// Registro de Service Worker para soporte Offline Rural PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SICARA PWA] Service Worker registrado exitosamente:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SICARA PWA] Fallo al registrar Service Worker:', err);
      });
  });
}

