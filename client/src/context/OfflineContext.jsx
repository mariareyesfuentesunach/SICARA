import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, isOnline, syncOfflineQueue } from '../services/api';
import { getPendingQueue } from '../services/offlineStorage';
import { useToast } from './ToastContext';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [online, setOnline] = useState(() => isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const { showToast } = useToast();

  // Actualizar el conteo de la cola offline
  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getPendingQueue();
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Función para forzar la sincronización manual o automática
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    
    // Verificar primero si realmente hay pendientes antes de marcar isSyncing
    const initialQueue = await getPendingQueue();
    if (initialQueue.length === 0) {
      setPendingCount(0);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      setLastSyncResult(result);
      if (result.synced > 0) {
        showToast(
          `¡Sincronización completa! Se subieron exitosamente ${result.synced} cambio(s) acumulados.`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error durante la sincronización:', err);
    } finally {
      await refreshPendingCount();
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount, showToast]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setOnline(true);
      showToast('Se ha detectado conexión a internet. Sincronizando datos automáticamente...', 'info');
      triggerSync();
    };

    const handleOffline = () => {
      setOnline(false);
      showToast(
        'Sin conexión a internet. SICARA funcionará en modo offline guardando sus cambios en su equipo.',
        'warning'
      );
    };

    const handleQueueChange = () => {
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sicara_offline_queue_changed', handleQueueChange);

    // Intentar sincronizar al cargar si hay red y pendientes
    if (navigator.onLine) {
      triggerSync();
    }

    // Intervalo de verificación periódica cada 15 segundos (para reconexiones silenciosas)
    const interval = setInterval(() => {
      if (navigator.onLine && !isSyncing) {
        getPendingQueue().then((q) => {
          setPendingCount(q.length);
          if (q.length > 0) {
            triggerSync();
          }
        });
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sicara_offline_queue_changed', handleQueueChange);
      clearInterval(interval);
    };
  }, [triggerSync, refreshPendingCount, showToast]);

  return (
    <OfflineContext.Provider
      value={{
        online,
        pendingCount,
        isSyncing,
        lastSyncResult,
        triggerSync,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline debe ser usado dentro de un OfflineProvider');
  }
  return context;
}

