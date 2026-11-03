import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  School,
  MapPin,
  Mail,
  Phone,
  User,
  Calendar,
  ExternalLink,
  RefreshCw,
  Undo2,
  Inbox,
  Archive,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function NotificacionesView({ onNavigate, onRefreshNotif }) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'leidas'
  const [pendientes, setPendientes] = useState([]);
  const [leidas, setLeidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar notificaciones desde la base de datos
  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNotificaciones();
      if (res.success) {
        setPendientes(res.pendientes || []);
        setLeidas(res.leidas || []);
      }
    } catch (err) {
      console.error('Error al consultar notificaciones:', err);
      showToast('Error al consultar las notificaciones de solicitudes.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // Marcar una notificación como leída (Mueve a bandeja de leídas)
  const handleMarcarLeida = async (idSolicitud, nombreEscuela) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.marcarNotificacionLeida(idSolicitud);
      if (res.success) {
        showToast(`Notificación de "${nombreEscuela}" movida a leídas.`, 'success');
        // Mover localmente
        const item = pendientes.find((p) => p.id_solicitud === idSolicitud);
        if (item) {
          setPendientes((prev) => prev.filter((p) => p.id_solicitud !== idSolicitud));
          setLeidas((prev) => [{ ...item, leida: true, fecha_leida: new Date().toISOString() }, ...prev]);
        }
        if (onRefreshNotif) onRefreshNotif();
      }
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err);
      showToast(err.message || 'Error al actualizar estado de la notificación.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Marcar/Mover de regreso a pendientes
  const handleMarcarPendiente = async (idSolicitud, nombreEscuela) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.marcarNotificacionPendiente(idSolicitud);
      if (res.success) {
        showToast(`Notificación de "${nombreEscuela}" regresada a pendientes.`, 'info');
        const item = leidas.find((l) => l.id_solicitud === idSolicitud);
        if (item) {
          setLeidas((prev) => prev.filter((l) => l.id_solicitud !== idSolicitud));
          setPendientes((prev) => [{ ...item, leida: false, fecha_leida: null }, ...prev]);
        }
        if (onRefreshNotif) onRefreshNotif();
      }
    } catch (err) {
      console.error('Error al mover a pendientes:', err);
      showToast(err.message || 'Error al actualizar estado de la notificación.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Marcar todas las notificaciones pendientes como leídas
  const handleMarcarTodasLeidas = async () => {
    if (pendientes.length === 0 || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.marcarTodasNotificacionesLeidas();
      if (res.success) {
        showToast(`${res.actualizadas || pendientes.length} notificaciones marcadas como leídas.`, 'success');
        fetchNotificaciones();
        if (onRefreshNotif) onRefreshNotif();
      }
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err);
      showToast(err.message || 'Error al actualizar notificaciones.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const listaActual = activeTab === 'pendientes' ? pendientes : leidas;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra Superior con Selector de Bandejas y Acciones */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Selector de Bandejas (Tabs) */}
        <div className="flex items-center gap-1.5 p-1 bg-app-bg rounded-subtle border border-app-border">
          {/* Bandeja de Pendientes */}
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pendientes'
                ? 'bg-white text-vino-dark shadow-sm border border-app-border/80'
                : 'text-app-muted hover:text-app-text hover:bg-white/50'
            }`}
          >
            <Bell className={`w-4 h-4 ${activeTab === 'pendientes' ? 'text-status-warning' : ''}`} />
            <span>Notificaciones Pendientes</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                pendientes.length > 0
                  ? 'bg-status-warning text-white animate-pulse'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {pendientes.length}
            </span>
          </button>

          {/* Bandeja de Leídas */}
          <button
            onClick={() => setActiveTab('leidas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'leidas'
                ? 'bg-white text-vino-dark shadow-sm border border-app-border/80'
                : 'text-app-muted hover:text-app-text hover:bg-white/50'
            }`}
          >
            <CheckCheck className={`w-4 h-4 ${activeTab === 'leidas' ? 'text-status-success' : ''}`} />
            <span>Notificaciones Leídas</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-700">
              {leidas.length}
            </span>
          </button>
        </div>

        {/* Acciones Globales */}
        <div className="flex items-center gap-2">
          {activeTab === 'pendientes' && pendientes.length > 0 && (
            <button
              onClick={handleMarcarTodasLeidas}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-subtle bg-vino-soft hover:bg-vino-border text-vino-dark text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              title="Marcar todas las notificaciones pendientes como leídas"
            >
              <CheckCheck className="w-4 h-4 text-vino-primary" />
              <span>Marcar todas como leídas</span>
            </button>
          )}

          <button
            onClick={fetchNotificaciones}
            disabled={loading}
            className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors cursor-pointer"
            title="Recargar notificaciones"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner Informativo */}
      <div className="p-4 rounded-card bg-vino-soft/40 border border-vino-border/40 text-xs text-vino-dark flex items-start gap-3">
        <School className="w-5 h-5 text-vino-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Avisos de Registro Escolar Rural (SICARA):</p>
          <p className="text-app-text/90 leading-relaxed">
            {activeTab === 'pendientes'
              ? 'En esta bandeja se muestran todas las notificaciones generadas cuando una escuela rural envía su solicitud de registro. Permanecerán aquí como pendientes hasta que las revise y decida marcarlas como leídas.'
              : 'En esta bandeja se conservan todas las notificaciones de solicitudes que ya han sido revisadas. Puede consultarlas en cualquier momento o devolverlas a la bandeja de pendientes si lo requiere.'}
          </p>
        </div>
      </div>

      {/* Lista de Notificaciones de la Bandeja Activa */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="bg-white rounded-card p-12 text-center text-app-muted text-xs border border-app-border shadow-soft flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-vino-primary border-t-transparent rounded-full animate-spin" />
            <span>Consultando bandeja de notificaciones en PostgreSQL...</span>
          </div>
        ) : listaActual.length === 0 ? (
          <div className="bg-white rounded-card p-12 text-center border border-app-border shadow-soft flex flex-col items-center justify-center gap-3">
            <div className="p-3.5 rounded-full bg-vino-soft text-vino-primary">
              {activeTab === 'pendientes' ? <CheckCircle2 className="w-8 h-8 text-status-success" /> : <Archive className="w-8 h-8" />}
            </div>
            <div>
              <p className="font-bold text-app-text text-sm">
                {activeTab === 'pendientes'
                  ? 'No hay notificaciones pendientes'
                  : 'No hay notificaciones en la bandeja de leídas'}
              </p>
              <p className="text-xs text-app-muted mt-1 max-w-md">
                {activeTab === 'pendientes'
                  ? 'Todas las solicitudes de registro de escuelas han sido revisadas o no hay solicitudes nuevas por el momento.'
                  : 'Las notificaciones que marque como leídas aparecerán aquí para su consulta posterior.'}
              </p>
            </div>
            {activeTab === 'pendientes' && (
              <button
                onClick={() => onNavigate('solicitudes')}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white text-xs font-bold transition-all cursor-pointer"
              >
                <span>Ir al Módulo de Solicitudes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          listaActual.map((n) => {
            const isPendiente = !n.leida;

            return (
              <div
                key={n.id_solicitud}
                className={`rounded-card border transition-all p-5 shadow-soft hover:shadow-card ${
                  isPendiente
                    ? 'bg-white border-app-border border-l-4 border-l-vino-primary'
                    : 'bg-gray-50/80 border-app-border/80 border-l-4 border-l-gray-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Contenido Principal de la Solicitud */}
                  <div className="flex-1 space-y-2.5 min-w-0">
                    {/* Encabezado de la Tarjeta */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isPendiente ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse" />
                          Nueva Solicitud Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-800 border border-green-200">
                          <CheckCheck className="w-3 h-3 text-status-success" />
                          Revisada / Leída
                        </span>
                      )}

                      <span className="text-app-muted text-xs">•</span>

                      {/* Estado oficial en el flujo de solicitud */}
                      <Badge status={n.estado_solicitud} />

                      {/* Fecha de lectura si aplica */}
                      {!isPendiente && n.fecha_leida && (
                        <span className="text-[11px] text-app-muted">
                          (Leída el {new Date(n.fecha_leida).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>

                    {/* Título: Nombre de la escuela */}
                    <div>
                      <h3 className="text-base font-bold text-app-text flex items-center gap-2">
                        <span>{n.nombre_escuela}</span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          CCT: {n.cct}
                        </span>
                      </h3>
                      <p className="text-xs text-app-muted mt-0.5 leading-relaxed">
                        {n.descripcion}
                      </p>
                    </div>

                    {/* Metadatos relevantes en rejilla */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 text-app-text">
                        <School className="w-3.5 h-3.5 text-vino-primary shrink-0" />
                        <span><strong>Nivel:</strong> {n.nivel_educativo} ({n.turno})</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-app-text">
                        <MapPin className="w-3.5 h-3.5 text-vino-primary shrink-0" />
                        <span className="truncate"><strong>Ubicación:</strong> {n.municipio}, {n.estado}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-app-text">
                        <User className="w-3.5 h-3.5 text-vino-primary shrink-0" />
                        <span className="truncate"><strong>Director:</strong> {n.nombre_responsable}</span>
                      </div>

                      {n.correo_responsable && (
                        <div className="flex items-center gap-1.5 text-app-muted font-mono text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-vino-primary shrink-0" />
                          <span className="truncate">{n.correo_responsable}</span>
                        </div>
                      )}

                      {n.telefono_responsable && (
                        <div className="flex items-center gap-1.5 text-app-muted text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-vino-primary shrink-0" />
                          <span>{n.telefono_responsable}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-app-muted text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-vino-primary shrink-0" />
                        <span>
                          {n.fecha_solicitud
                            ? new Date(n.fecha_solicitud).toLocaleString('es-MX', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Reciente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-app-border justify-end">
                    {/* Botón Marcar como leída / Mover a pendientes */}
                    {isPendiente ? (
                      <button
                        onClick={() => handleMarcarLeida(n.id_solicitud, n.nombre_escuela)}
                        disabled={actionLoading}
                        className="w-full sm:w-44 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-subtle bg-status-success hover:bg-green-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        title="Marcar como leída y mover a la bandeja de leídas"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Marcar como leída</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarcarPendiente(n.id_solicitud, n.nombre_escuela)}
                        disabled={actionLoading}
                        className="w-full sm:w-44 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-subtle bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                        title="Regresar a la bandeja de pendientes"
                      >
                        <Undo2 className="w-4 h-4 text-amber-700" />
                        <span>Mover a pendientes</span>
                      </button>
                    )}

                    {/* Botón Ver Solicitud en el módulo */}
                    <button
                      onClick={() => onNavigate('solicitudes')}
                      className="w-full sm:w-44 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-subtle bg-vino-soft hover:bg-vino-border text-vino-dark text-xs font-bold transition-all cursor-pointer"
                      title="Abrir módulo de solicitudes para dictaminar o ver detalles"
                    >
                      <span>Ver Solicitud</span>
                      <ExternalLink className="w-3.5 h-3.5 text-vino-primary" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
