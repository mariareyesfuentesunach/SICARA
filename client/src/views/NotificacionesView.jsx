import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import {
  Bell,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Calendar,
  Filter,
} from 'lucide-react';

export default function NotificacionesView({ onNavigate, onRefreshNotif }) {
  const { showToast } = useToast();

  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotificaciones = async () => {
    setLoading(true);
    try {
      const res = await api.getNotificaciones();
      if (res.success) {
        setNotificaciones(res.notificaciones);
      }
    } catch (err) {
      console.error('Error al obtener notificaciones:', err);
      showToast('Error al consultar avisos del sistema.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
  }, []);

  const handleResolverAlerta = async (idAlerta) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.resolverAlerta(idAlerta);
      if (res.success) {
        showToast('Alerta marcada como resuelta.', 'success');
        setNotificaciones((prev) =>
          prev.map((n) =>
            n.referencia_id === idAlerta ? { ...n, estado: 'Resuelta' } : n
          )
        );
        if (onRefreshNotif) onRefreshNotif();
      }
    } catch (err) {
      console.error('Error al resolver alerta:', err);
      showToast('Error al actualizar la alerta.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredNotif = notificaciones.filter((n) => {
    if (filter === 'todas') return true;
    if (filter === 'solicitudes') return n.categoria === 'Solicitudes';
    if (filter === 'alertas') return n.categoria === 'Alertas';
    if (filter === 'historial') return n.categoria === 'Historial';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-card p-4 sm:p-5 border border-app-border shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-app-bg p-1 rounded-subtle border border-app-border text-xs font-semibold">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'solicitudes', label: 'Solicitudes' },
            { id: 'alertas', label: 'Alertas' },
            { id: 'historial', label: 'Historial' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                filter === tab.id
                  ? 'bg-white text-vino-dark shadow-xs font-bold'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={fetchNotificaciones}
          className="p-2 rounded-subtle border border-app-border bg-white text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors"
          title="Recargar notificaciones"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Lista de Notificaciones */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-2">
            <svg className="animate-spin h-6 w-6 text-vino-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Cargando avisos administrativos...</span>
          </div>
        ) : filteredNotif.length === 0 ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-vino-soft text-vino-primary">
              <Bell className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-app-text text-base">No hay avisos en esta categoría</p>
              <p className="text-xs text-app-muted mt-0.5">
                El sistema no registra notificaciones pendientes con este filtro.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {filteredNotif.map((n) => {
              const isSolicitud = n.tipo.includes('solicitud');
              const isAlerta = n.tipo.includes('alerta');
              const isActiva = n.estado.toLowerCase() === 'pendiente' || n.estado.toLowerCase() === 'activa';

              return (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    isActiva ? 'bg-white hover:bg-vino-soft/20' : 'bg-gray-50/60 hover:bg-gray-100/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isSolicitud
                          ? 'bg-status-warning-bg text-status-warning border border-status-warning-border'
                          : isAlerta
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {isSolicitud ? (
                        <ClipboardList className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-vino-dark">
                          {n.categoria}
                        </span>
                        <span>•</span>
                        <span className="text-xs text-app-muted">
                          {n.fecha ? new Date(n.fecha).toLocaleString('es-MX') : 'Reciente'}
                        </span>
                        <Badge status={n.estado} />
                      </div>

                      <h4 className="text-sm font-bold text-app-text">
                        {n.titulo}
                      </h4>
                      <p className="text-xs text-app-muted leading-relaxed">
                        {n.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isAlerta && n.estado.toLowerCase() === 'activa' && (
                      <button
                        onClick={() => handleResolverAlerta(n.referencia_id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-subtle bg-status-success-bg hover:bg-green-200 text-status-success text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Marcar Resuelta</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate(n.enlace === '/solicitudes' ? 'solicitudes' : 'dashboard')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-subtle bg-vino-soft hover:bg-vino-border text-vino-dark text-xs font-bold transition-colors"
                    >
                      <span>Ver Módulo</span>
                      <ExternalLink className="w-3.5 h-3.5 text-vino-primary" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
