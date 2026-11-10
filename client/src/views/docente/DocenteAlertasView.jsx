import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  BellRing,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Calendar,
  MessageSquare,
} from 'lucide-react';

export default function DocenteAlertasView({ docente, asignaciones = [], onNavigateToReporte }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState([]);
  const [filterTipo, setFilterTipo] = useState('todos'); // 'todos' | 'Inasistencia' | 'Bajo Rendimiento'
  const [filterEstado, setFilterEstado] = useState('todos'); // 'todos' | 'Pendiente' | 'Resuelta'
  const [search, setSearch] = useState('');

  // Modal para resolver / dar seguimiento
  const [selectedAlerta, setSelectedAlerta] = useState(null);
  const [resolviendo, setResolviendo] = useState(false);
  const [obsResolucion, setObsResolucion] = useState('');

  const primaryColor = docente?.color_primario || '#722F37';

  const fetchAlertas = async () => {
    setLoading(true);
    try {
      const res = await api.getDocenteAlertas({
        tipo: filterTipo,
        estado: filterEstado,
      });

      if (res.success) {
        setAlertas(res.alertas || []);
      }
    } catch (err) {
      console.error('Error al cargar alertas del docente:', err);
      showToast('Error al consultar alertas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, [filterTipo, filterEstado]);

  const handleOpenResolver = (al) => {
    setSelectedAlerta(al);
    setObsResolucion(al.observaciones || '');
  };

  const handleConfirmResolver = async () => {
    if (!selectedAlerta) return;
    setResolviendo(true);
    try {
      const res = await api.resolverDocenteAlerta(selectedAlerta.id_alerta, {
        estado_alerta: 'Resuelta',
        observaciones: obsResolucion,
      });

      if (res.success) {
        showToast('Alerta marcada como atendida y resuelta.', 'success');
        setSelectedAlerta(null);
        fetchAlertas();
      }
    } catch (err) {
      showToast(err.message || 'Error al resolver alerta.', 'error');
    } finally {
      setResolviendo(false);
    }
  };

  const alertasFiltradas = alertas.filter((al) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nom = `${al.nombre} ${al.apellidos || ''}`.toLowerCase();
    const curp = (al.curp || '').toLowerCase();
    const desc = (al.descripcion || '').toLowerCase();
    return nom.includes(q) || curp.includes(q) || desc.includes(q);
  });

  const conteoInasistencias = alertas.filter((a) => a.tipo_alerta === 'Inasistencia' && a.estado_alerta !== 'Resuelta').length;
  const conteoBajoRendimiento = alertas.filter((a) => a.tipo_alerta === 'Bajo Rendimiento' && a.estado_alerta !== 'Resuelta').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <BellRing className="w-5 h-5 text-vino-primary" />
            Centro de Alertas de Alumnos
          </h2>
          <p className="text-xs text-app-muted">
            Alertas automáticas por inasistencia injustificada y bajo rendimiento académico (reprobación)
          </p>
        </div>

        <button
          onClick={fetchAlertas}
          disabled={loading}
          className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary transition-colors cursor-pointer self-start md:self-auto"
          title="Recargar alertas"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Resumen de Alertas Pendientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-card bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block">
              Inasistencias Injustificadas
            </span>
            <span className="text-2xl font-black text-amber-950 mt-1 block">
              {conteoInasistencias}
            </span>
            <span className="text-[10px] text-amber-800">
              Alumnos con faltas sin justificar reportadas
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-200/60 flex items-center justify-center">
            <UserX className="w-5 h-5 text-amber-700" />
          </div>
        </div>

        <div className="p-4 rounded-card bg-red-50 border border-red-200 text-red-900 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block">
              Bajo Rendimiento Crítico
            </span>
            <span className="text-2xl font-black text-red-950 mt-1 block">
              {conteoBajoRendimiento}
            </span>
            <span className="text-[10px] text-red-800">
              Calificaciones en rango rojo (5.0 a 0.0)
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-200/60 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-700" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por alumno, CURP o motivo..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
          />
        </div>

        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-medium"
        >
          <option value="todos">Todos los tipos de alerta</option>
          <option value="Inasistencia">Inasistencia Injustificada</option>
          <option value="Bajo Rendimiento">Bajo Rendimiento Académico</option>
        </select>

        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-medium"
        >
          <option value="todos">Todos los estados</option>
          <option value="Pendiente">Pendientes / Activas</option>
          <option value="Resuelta">Resueltas / Atendidas</option>
        </select>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-card p-12 text-center text-app-muted border border-app-border shadow-soft text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
            Consultando alertas de alumnos...
          </div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="bg-white rounded-card p-12 text-center text-app-muted border border-app-border shadow-soft text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No hay alertas que coincidan con los filtros seleccionados.
          </div>
        ) : (
          alertasFiltradas.map((al) => {
            const esInasistencia = al.tipo_alerta === 'Inasistencia';
            return (
              <div
                key={al.id_alerta}
                className={`p-4 rounded-card border transition-all bg-white shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  al.estado_alerta === 'Resuelta'
                    ? 'border-app-border opacity-75'
                    : esInasistencia
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-red-300 bg-red-50/20'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-card flex items-center justify-center shrink-0 ${
                      esInasistencia ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {esInasistencia ? <UserX className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          esInasistencia
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {al.tipo_alerta}
                      </span>
                      <strong className="text-sm font-bold text-app-text">
                        {al.nombre} {al.apellidos}
                      </strong>
                      <span className="text-[11px] text-app-muted font-medium">
                        ({al.nombre_grupo} - {al.grado}°)
                      </span>
                      <span className="font-mono text-[10px] text-app-muted">
                        CURP: {al.curp || 'S/C'}
                      </span>
                    </div>

                    <p className="text-app-text">{al.descripcion}</p>

                    {al.observaciones && (
                      <p className="text-[11px] text-app-muted italic bg-white/70 p-1.5 rounded border border-app-border/60">
                        Observación: {al.observaciones}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-app-muted font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {al.fecha_generacion ? new Date(al.fecha_generacion).toLocaleDateString('es-MX') : ''}
                      </span>
                      <span>•</span>
                      <span
                        className={`font-bold ${
                          al.estado_alerta === 'Resuelta' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        Estado: {al.estado_alerta}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {onNavigateToReporte && (
                    <button
                      onClick={() => onNavigateToReporte(al)}
                      className="px-3 py-1.5 rounded-subtle bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Generar reporte pedagógico de este alumno"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Crear Reporte</span>
                    </button>
                  )}

                  {al.estado_alerta !== 'Resuelta' && (
                    <button
                      onClick={() => handleOpenResolver(al)}
                      className="px-3 py-1.5 rounded-subtle bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dar Seguimiento</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Dar seguimiento y resolver alerta */}
      <Modal
        isOpen={!!selectedAlerta}
        onClose={() => setSelectedAlerta(null)}
        title="Seguimiento y Resolución de Alerta"
        subtitle={`Alumno: ${selectedAlerta?.nombre} ${selectedAlerta?.apellidos || ''} (${selectedAlerta?.tipo_alerta})`}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              onClick={() => setSelectedAlerta(null)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmResolver}
              disabled={resolviendo}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {resolviendo ? 'Guardando...' : 'Marcar como Resuelta'}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-app-muted">
            Registre las acciones o acuerdos pedagógicos tomados con el alumno o padre de familia para resolver esta alerta:
          </p>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Observaciones / Acciones Realizadas
            </label>
            <textarea
              rows={4}
              value={obsResolucion}
              onChange={(e) => setObsResolucion(e.target.value)}
              placeholder="Ej. Se dialogó con el tutor, se acordó plan de recuperación de tareas y justificante médico presentado..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

