import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Layers,
  BellRing,
  AlertTriangle,
  Award,
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function DocenteDashboardView({ docente, onNavigate }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    totalGrupos: 0,
    alertasRecientes: [],
  });

  const primaryColor = docente?.color_primario || '#722F37';

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.getDocenteDashboard();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Error al cargar dashboard de docente:', err);
      showToast('Error al cargar resumen del docente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tarjeta de Bienvenida */}
      <div className="bg-white rounded-card p-6 border border-app-border shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-vino-primary block">
            Bienvenido al Sistema de Gestión Académica
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-app-text mt-1">
            Profr(a). {docente?.nombre} {docente?.apellidos || ''}
          </h1>
          <p className="text-xs text-app-muted mt-1">
            Monitoreo en tiempo real de asistencia, rangos de rendimiento académico y alertas automáticas de sus alumnos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('asistencia')}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2.5 rounded-subtle text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Pasar Asistencia</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block">
              Alumnos a Cargo
            </span>
            <span className="text-2xl font-black text-app-text mt-1 block">
              {stats.totalAlumnos}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">
              Matrícula en sus grupos
            </span>
          </div>
          <div className="w-12 h-12 rounded-card bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block">
              Grupos Asignados
            </span>
            <span className="text-2xl font-black text-app-text mt-1 block">
              {stats.totalGrupos}
            </span>
            <span className="text-[10px] text-purple-600 font-semibold">
              Carga curricular activa
            </span>
          </div>
          <div className="w-12 h-12 rounded-card bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block">
              Alertas Activas
            </span>
            <span className="text-2xl font-black text-red-600 mt-1 block">
              {stats.alertasRecientes.filter((a) => a.estado_alerta !== 'Resuelta').length}
            </span>
            <span className="text-[10px] text-red-500 font-semibold">
              Inasistencia y Bajo Rendimiento
            </span>
          </div>
          <div className="w-12 h-12 rounded-card bg-red-50 text-red-600 flex items-center justify-center">
            <BellRing className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block">
              Semáforo de Rendimiento
            </span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" title="Verde: 10 - 9" />
              <span className="w-3 h-3 rounded-full bg-amber-500" title="Amarillo: 8.9 - 7" />
              <span className="w-3 h-3 rounded-full bg-red-500" title="Rojo: 6.9 - 0" />
            </div>
            <span className="text-[10px] text-app-muted font-semibold mt-1 block">
              3 Rangos configurados
            </span>
          </div>
          <div className="w-12 h-12 rounded-card bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Guía Visual de Rangos de Rendimiento */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft">
        <h3 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-vino-primary" />
          Criterios de Clasificación por Rendimiento Académico
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-emerald-600 shrink-0" />
            <div>
              <strong className="block font-bold">Rango Verde: 10.0 a 9.0</strong>
              <p className="text-[11px] text-emerald-800">
                Aprovechamiento sobresaliente y objetivos educativos consolidados.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-card bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-amber-600 shrink-0" />
            <div>
              <strong className="block font-bold">Rango Amarillo: 8.9 a 7.0</strong>
              <p className="text-[11px] text-amber-800">
                Nivel regular. Requiere atención preventiva y reforzamiento académico.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-card bg-red-50 border border-red-200 text-red-900 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-red-600 shrink-0" />
            <div>
              <strong className="block font-bold">Rango Rojo: 6.9 a 0.0</strong>
              <p className="text-[11px] text-red-800">
                Bajo rendimiento académico. Dispara alertas docentes automáticas y emisión de reportes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Recientes de Alumnos */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="p-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-text">
              Alertas Recientes de Alumnos a su Cargo
            </h3>
          </div>
          <button
            onClick={() => onNavigate('alertas')}
            className="text-xs font-bold text-vino-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todas las alertas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-app-border/60">
          {loading ? (
            <div className="py-8 text-center text-app-muted text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-vino-primary" />
              Cargando alertas del docente...
            </div>
          ) : stats.alertasRecientes.length === 0 ? (
            <div className="py-8 text-center text-app-muted text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              Excelente: No hay alertas pendientes de inasistencia ni bajo rendimiento en sus grupos.
            </div>
          ) : (
            stats.alertasRecientes.map((al) => (
              <div key={al.id_alerta} className="p-4 hover:bg-gray-50/70 transition-colors flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        al.tipo_alerta === 'Inasistencia'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      {al.tipo_alerta}
                    </span>
                    <strong className="text-app-text font-bold text-sm">
                      {al.nombre} {al.apellidos}
                    </strong>
                    <span className="text-[11px] text-app-muted font-medium">
                      ({al.nombre_grupo} - {al.grado}°)
                    </span>
                  </div>
                  <p className="text-app-text text-xs">{al.descripcion}</p>
                  {al.observaciones && (
                    <p className="text-[11px] text-app-muted italic">
                      Nota: {al.observaciones}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-app-muted font-mono block">
                    {al.fecha_generacion ? new Date(al.fecha_generacion).toLocaleDateString('es-MX') : ''}
                  </span>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      al.estado_alerta === 'Resuelta'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {al.estado_alerta || 'Pendiente'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

