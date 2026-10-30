import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import {
  School,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Eye,
  RefreshCw,
  Sparkles,
  BarChart3,
  Calendar,
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Error cargando métricas:', err);
      showToast('Error al actualizar métricas del sistema.', 'error');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-white rounded-card border border-app-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-card border border-app-border" />
          ))}
        </div>
        <div className="h-80 bg-white rounded-card border border-app-border" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Escuelas Registradas',
      value: stats?.totalEscuelas ?? 0,
      icon: School,
      color: 'text-vino-primary',
      bgColor: 'bg-vino-soft',
      borderColor: 'border-vino-border',
      onClick: () => onNavigate('escuelas'),
      description: 'Planteles activos en base de datos',
    },
    {
      title: 'Solicitudes Pendientes',
      value: stats?.solicitudesPendientes ?? 0,
      icon: ClipboardList,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning-bg',
      borderColor: 'border-status-warning-border',
      onClick: () => onNavigate('solicitudes'),
      description: 'Requieren revisión y dictamen',
    },
    {
      title: 'Solicitudes Aprobadas',
      value: stats?.solicitudesAprobadas ?? 0,
      icon: CheckCircle2,
      color: 'text-status-success',
      bgColor: 'bg-status-success-bg',
      borderColor: 'border-status-success-border',
      onClick: () => onNavigate('solicitudes'),
      description: 'Escuelas dadas de alta',
    },
    {
      title: 'Solicitudes Rechazadas',
      value: stats?.solicitudesRechazadas ?? 0,
      icon: XCircle,
      color: 'text-status-error',
      bgColor: 'bg-status-error-bg',
      borderColor: 'border-status-error-border',
      onClick: () => onNavigate('solicitudes'),
      description: 'Con observaciones registradas',
    },
    {
      title: 'Usuarios Totales',
      value: stats?.totalUsuarios ?? 0,
      icon: Users,
      color: 'text-vino-light',
      bgColor: 'bg-vino-soft',
      borderColor: 'border-vino-border',
      onClick: () => onNavigate('usuarios'),
      description: `${stats?.rolesBreakdown?.directivos || 0} Directivos, ${stats?.rolesBreakdown?.docentes || 0} Docentes`,
    },
    {
      title: 'Alertas Activas',
      value: stats?.totalAlertas ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      onClick: () => onNavigate('notificaciones'),
      description: 'Riesgo académico y ausentismo',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida Inspirado en la interfaz moderna */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-r from-vino-dark via-vino to-vino-light text-white p-6 sm:p-8 shadow-elevated">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Módulo de Control Central • SICARA</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hola, {user?.nombre || 'Administrador'}
          </h1>
          <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
            Bienvenido al panel central de administración. Supervise las solicitudes de nuevas escuelas rurales, gestione el catálogo de instituciones y coordine las cuentas directivas con datos reales sincronizados en PostgreSQL.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => onNavigate('solicitudes')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-subtle bg-white text-vino-dark hover:bg-vino-soft font-bold text-xs shadow-md transition-all"
            >
              <ClipboardList className="w-4 h-4 text-vino-primary" />
              <span>Revisar Solicitudes</span>
            </button>
            <button
              onClick={() => onNavigate('escuelas')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-subtle bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm transition-all"
            >
              <School className="w-4 h-4" />
              <span>Ver Escuelas</span>
            </button>
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-subtle bg-black/20 hover:bg-black/30 text-white/90 text-xs font-medium transition-all"
              title="Refrescar datos de la base de datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Círculos decorativos de fondo */}
        <div className="absolute right-[-40px] top-[-40px] w-80 h-80 rounded-full bg-white/5 pointer-events-none blur-2xl" />
        <div className="absolute right-20 bottom-[-20px] w-60 h-60 rounded-full bg-amber-500/10 pointer-events-none blur-xl" />
      </div>

      {/* Grid de Tarjetas de Métricas */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-app-text">
            Métricas del Sistema
          </h2>
          <span className="text-xs text-app-muted">Datos en tiempo real de la base de datos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={card.onClick}
                className="bg-white rounded-card p-5 border border-app-border shadow-soft hover:shadow-card transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-app-muted uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color} border ${card.borderColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-app-text">
                    {card.value}
                  </div>
                  <p className="text-xs text-app-muted mt-1 truncate">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-app-border flex items-center justify-between text-xs font-semibold text-vino-primary group-hover:text-vino-dark">
                  <span>Acceder a la sección</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accesos Rápidos y Solicitudes Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Solicitudes Recientes (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-card p-5 border border-app-border shadow-soft">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-app-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-vino-primary" />
              <h3 className="text-base font-bold text-app-text">
                Solicitudes de Escuelas Recientes
              </h3>
            </div>
            <button
              onClick={() => onNavigate('solicitudes')}
              className="text-xs font-bold text-vino-primary hover:text-vino-dark flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.solicitudesRecientes?.length === 0 ? (
            <div className="py-8 text-center text-xs text-app-muted">
              No hay solicitudes registradas actualmente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-app-border text-app-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Escuela</th>
                    <th className="py-2.5 px-3">CCT</th>
                    <th className="py-2.5 px-3">Nivel</th>
                    <th className="py-2.5 px-3">Municipio</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {stats?.solicitudesRecientes?.map((s) => (
                    <tr
                      key={s.id_solicitud}
                      onClick={() => onNavigate('solicitudes')}
                      className="hover:bg-vino-soft/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-app-text">
                        {s.nombre_escuela}
                      </td>
                      <td className="py-3 px-3 font-mono text-app-muted">
                        {s.cct || 'S/N'}
                      </td>
                      <td className="py-3 px-3 text-app-text">
                        {s.nivel_educativo || 'Primaria'}
                      </td>
                      <td className="py-3 px-3 text-app-muted">
                        {s.municipio || 'Jalisco'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge status={s.estado_solicitud} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Columna Derecha: Alertas y Distribución Escolar (1 col) */}
        <div className="space-y-6">
          {/* Distribución por Nivel */}
          <div className="bg-white rounded-card p-5 border border-app-border shadow-soft">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-app-border">
              <BarChart3 className="w-5 h-5 text-vino-primary" />
              <h3 className="text-base font-bold text-app-text">
                Escuelas por Nivel
              </h3>
            </div>

            {stats?.escuelasPorNivel?.length === 0 ? (
              <p className="text-xs text-app-muted py-2">Sin escuelas registradas.</p>
            ) : (
              <div className="space-y-3">
                {stats?.escuelasPorNivel?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-app-text">{item.nivel}</span>
                    <span className="px-2 py-0.5 rounded-full bg-vino-soft text-vino-primary font-bold">
                      {item.cantidad} {parseInt(item.cantidad, 10) === 1 ? 'plantel' : 'planteles'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas Recientes */}
          <div className="bg-white rounded-card p-5 border border-app-border shadow-soft">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-app-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-status-warning" />
                <h3 className="text-base font-bold text-app-text">
                  Alertas del Sistema
                </h3>
              </div>
              <button
                onClick={() => onNavigate('notificaciones')}
                className="text-xs font-bold text-vino-primary hover:text-vino-dark"
              >
                Ver más
              </button>
            </div>

            {stats?.alertasRecientes?.length === 0 ? (
              <p className="text-xs text-app-muted py-2">No hay alertas registradas.</p>
            ) : (
              <div className="space-y-3">
                {stats?.alertasRecientes?.map((a) => (
                  <div
                    key={a.id_alerta}
                    className="p-3 rounded-subtle bg-gray-50 border border-app-border/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-app-text">{a.tipo_alerta}</span>
                      <Badge status={a.estado_alerta} />
                    </div>
                    <p className="text-app-muted text-[11px] line-clamp-2">
                      {a.descripcion}
                    </p>
                    {a.nombre_escuela && (
                      <p className="text-[10px] text-vino-primary font-semibold">
                        Plantel: {a.nombre_escuela}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

