import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  AlertTriangle,
  Award,
  CalendarCheck,
  TrendingUp,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export default function DirectivoDashboardView({ onNavigate, escuela }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDirectivoDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error dashboard directivo:', err);
      showToast('Error al cargar datos del dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-app-muted">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-vino-primary" />
        <p className="text-sm font-semibold">Cargando indicadores de la escuela...</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const alertas = data?.alertasRecientes || [];

  const cards = [
    {
      title: 'Total Alumnos',
      value: stats.totalAlumnos ?? 0,
      sub: 'Matrícula activa',
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
      action: () => onNavigate('alumnos'),
    },
    {
      title: 'Total Docentes',
      value: stats.totalDocentes ?? 0,
      sub: 'Cuerpo docente activo',
      icon: GraduationCap,
      color: 'bg-emerald-50 text-emerald-700',
      action: () => onNavigate('docentes'),
    },
    {
      title: 'Total Grupos',
      value: stats.totalGrupos ?? 0,
      sub: 'Aulas y secciones',
      icon: Layers,
      color: 'bg-purple-50 text-purple-700',
      action: () => onNavigate('grupos'),
    },
    {
      title: 'Total Materias',
      value: stats.totalMaterias ?? 0,
      sub: 'Plan curricular activo',
      icon: BookOpen,
      color: 'bg-sky-50 text-sky-700',
      action: () => onNavigate('materias'),
    },
    {
      title: 'Alertas Pendientes',
      value: stats.alertasPendientes ?? 0,
      sub: 'Atención prioritaria',
      icon: AlertTriangle,
      color: stats.alertasPendientes > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700',
      action: () => onNavigate('alertas'),
    },
    {
      title: 'Promedio General',
      value: stats.promedioGeneral > 0 ? stats.promedioGeneral.toFixed(1) : 'S/C',
      sub: 'Rendimiento global',
      icon: Award,
      color: 'bg-rose-50 text-rose-700',
      action: () => onNavigate('rendimiento'),
    },
    {
      title: 'Asistencia General',
      value: `${stats.porcentajeAsistencia ?? 100}%`,
      sub: 'Registro acumulado',
      icon: CalendarCheck,
      color: 'bg-teal-50 text-teal-700',
      action: () => onNavigate('rendimiento'),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con bienvenida institucional */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
              Plantel Activo
            </span>
            <span className="text-xs text-app-muted">Ciclo 2024-2025</span>
          </div>
          <h2 className="text-lg font-bold text-app-text mt-1">
            {escuela?.nombre_escuela || 'Panel de Dirección Escolar'}
          </h2>
          <p className="text-xs text-app-muted">
            Monitoreo en tiempo real de alumnos, asistencia, calificaciones y alertas institucionales.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="self-start md:self-auto px-3 py-2 rounded-card border border-app-border bg-white text-app-text hover:bg-gray-50 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* Grid de 7 tarjetas informativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className="bg-white rounded-card p-4 border border-app-border shadow-soft hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-app-muted font-medium">{card.title}</p>
                  <p className="text-2xl font-bold text-app-text mt-1 tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-app-muted mt-0.5">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-app-border/60 flex items-center justify-between text-[11px] text-app-muted group-hover:text-vino-primary font-semibold">
                <span>Ver módulo</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección de Indicadores Visuales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimiento por Niveles */}
        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-app-text">Distribución de Rendimiento Académico</h3>
              <p className="text-[11px] text-app-muted">Alumnos según promedio de calificaciones registradas</p>
            </div>
            <TrendingUp className="w-4 h-4 text-app-muted" />
          </div>

          <div className="space-y-3">
            {(charts.nivelesRendimiento || []).length === 0 ? (
              <p className="text-xs text-app-muted py-6 text-center">No hay calificaciones registradas aún.</p>
            ) : (
              charts.nivelesRendimiento.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-app-text">{item.nivel}</span>
                    <span className="font-mono text-app-muted">{item.total} evaluaciones</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      style={{
                        backgroundColor: primaryColor,
                        width: `${Math.min(100, (item.total / (stats.totalAlumnos || 1)) * 100)}%`,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desempeño por Grupos */}
        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-app-text">Comparativa de Desempeño por Grupos</h3>
              <p className="text-[11px] text-app-muted">Promedio obtenido por cada aula escolar</p>
            </div>
            <Layers className="w-4 h-4 text-app-muted" />
          </div>

          <div className="space-y-3">
            {(charts.desempenoGrupos || []).length === 0 ? (
              <p className="text-xs text-app-muted py-6 text-center">Sin evaluaciones por grupo registradas.</p>
            ) : (
              charts.desempenoGrupos.map((grp, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-card bg-gray-50 border border-app-border text-xs">
                  <div>
                    <span className="font-bold text-app-text">{grp.nombre_grupo}</span>
                    <span className="text-[11px] text-app-muted ml-2">Grado: {grp.grado}°</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-app-muted">{grp.alumnos_evaluados} alumnos</span>
                    <span className="font-bold text-sm text-vino-dark px-2 py-0.5 rounded bg-white border border-app-border font-mono">
                      {grp.promedio}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Alertas Recientes y Alertas por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas por Tipo */}
        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft">
          <h3 className="text-sm font-bold text-app-text mb-1">Alertas por Tipo</h3>
          <p className="text-[11px] text-app-muted mb-4">Clasificación de situaciones escolares</p>

          <div className="space-y-2">
            {(charts.alertasPorTipo || []).length === 0 ? (
              <p className="text-xs text-app-muted py-4 text-center">No hay alertas registradas.</p>
            ) : (
              charts.alertasPorTipo.map((al, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded-card bg-amber-50/50 border border-amber-200/60 text-xs">
                  <span className="font-semibold text-amber-900">{al.tipo_alerta}</span>
                  <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-mono text-[11px]">
                    {al.total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alertas Pendientes de Atención */}
        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-app-text">Alertas Recientes para Seguimiento</h3>
              <p className="text-[11px] text-app-muted">Inasistencias frecuentes y riesgo académico</p>
            </div>
            <button
              onClick={() => onNavigate('alertas')}
              className="text-xs font-bold text-vino-primary hover:underline cursor-pointer"
            >
              Ver todas ({stats.alertasPendientes || 0})
            </button>
          </div>

          <div className="space-y-2.5">
            {alertas.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-4 rounded-card border border-emerald-200 text-center font-medium">
                ✔ No hay alertas pendientes en este momento. La escuela se encuentra al día.
              </p>
            ) : (
              alertas.map((al) => (
                <div
                  key={al.id_alerta}
                  onClick={() => onNavigate('alertas')}
                  className="p-3 rounded-card border border-app-border hover:border-amber-400 bg-white hover:bg-amber-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-app-text">{al.alumno_nombre || 'Alumno'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {al.tipo_alerta}
                      </span>
                    </div>
                    <p className="text-[11px] text-app-muted truncate mt-0.5">{al.descripcion}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-app-muted">
                    {new Date(al.fecha_generacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

