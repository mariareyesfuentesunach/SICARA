import React from 'react';
import { useOffline } from '../../context/OfflineContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  CloudUpload,
} from 'lucide-react';

export default function OfflineStatusBar() {
  const { online, pendingCount, isSyncing, triggerSync } = useOffline();

  // Si está en línea y no hay cambios pendientes por subir, OCULTAR TOTALMENTE
  if (online && pendingCount === 0) {
    return null;
  }

  // Si está en línea pero no está sincronizando y no hay pendientes, tampoco mostrar
  if (online && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`w-full py-2 px-4 text-xs font-medium transition-all duration-300 shadow-sm border-b flex items-center justify-between gap-3 ${
        !online
          ? 'bg-amber-500/15 border-amber-300 text-amber-900'
          : isSyncing
          ? 'bg-blue-500/15 border-blue-300 text-blue-900'
          : 'bg-amber-500/15 border-amber-300 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {!online ? (
          <span className="flex items-center gap-1.5 font-bold shrink-0 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>MODO RURAL OFFLINE</span>
          </span>
        ) : isSyncing ? (
          <span className="flex items-center gap-1.5 font-bold shrink-0 text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>SINCRONIZANDO</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-bold shrink-0 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
            <Database className="w-3.5 h-3.5" />
            <span>PENDIENTE DE SUBIR</span>
          </span>
        )}

        <p className="truncate text-xs">
          {!online
            ? 'Trabajando sin conexión. Las asistencias, calificaciones y altas se aseguran en este dispositivo.'
            : isSyncing
            ? 'Subiendo y sincronizando cambios acumulados con el servidor central...'
            : `${pendingCount} cambio(s) guardados en su dispositivo listos para sincronizar.`}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {pendingCount > 0 && !isSyncing && (
          <span className="inline-flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xs">
            <Database className="w-3 h-3 text-app-muted" />
            <span>{pendingCount} pendientes</span>
          </span>
        )}

        {online && !isSyncing && pendingCount > 0 && (
          <button
            onClick={triggerSync}
            className="flex items-center gap-1.5 px-3 py-1 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Subir cambios pendientes ahora"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Subir Cambios Ahora</span>
          </button>
        )}
      </div>
    </div>
  );
}

