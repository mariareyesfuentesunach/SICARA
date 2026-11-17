import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck,
  Search,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  Layers,
  RefreshCw,
  Filter,
  Calendar,
  FileSpreadsheet,
  Download,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

export default function DocenteAsistenciaView({ docente, asignaciones = [] }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modo de vista: 'diario' (Pase de lista del día actual) o 'historial' (Visualización por días pasados/meses + Exportar Excel)
  const [activeTab, setActiveTab] = useState('diario'); // 'diario' | 'historial'

  // Filtros de Asistencia Diaria
  const [selectedGrupoId, setSelectedGrupoId] = useState(asignaciones[0]?.id_grupo || '');
  const [selectedMateriaId, setSelectedMateriaId] = useState(asignaciones[0]?.id_materia || '');
  const [selectedFecha, setSelectedFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterRango, setFilterRango] = useState('todos'); // 'todos' | 'verde' | 'amarillo' | 'rojo'
  const [search, setSearch] = useState('');

  // Lista de alumnos y sus asistencias diarias
  const [alumnos, setAlumnos] = useState([]);
  const [resumen, setResumen] = useState({ verde: 0, amarillo: 0, rojo: 0, sinCalificar: 0, total: 0 });

  // Estado para la vista de Historial de Asistencia
  const [historialMes, setHistorialMes] = useState(() => new Date().getMonth() + 1);
  const [historialAnio, setHistorialAnio] = useState(() => new Date().getFullYear());
  const [historialData, setHistorialData] = useState({ fechas: [], alumnos: [] });
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const primaryColor = docente?.color_primario || '#722F37';

  // Si cambian las asignaciones iniciales, fijar el primer grupo
  useEffect(() => {
    if (!selectedGrupoId && asignaciones.length > 0) {
      setSelectedGrupoId(asignaciones[0].id_grupo);
      setSelectedMateriaId(asignaciones[0].id_materia);
    }
  }, [asignaciones]);

  // Cargar lista diaria
  const fetchAsistenciaData = async () => {
    if (!selectedGrupoId) return;
    setLoading(true);
    try {
      const res = await api.getDocenteAsistencia({
        id_grupo: selectedGrupoId,
        id_materia: selectedMateriaId,
        fecha: selectedFecha,
      });

      if (res.success) {
        setAlumnos(res.alumnos || []);
        setResumen(res.resumen || { verde: 0, amarillo: 0, rojo: 0, sinCalificar: 0, total: 0 });
      }
    } catch (err) {
      console.error('Error al cargar lista de asistencia:', err);
      showToast('Error al cargar lista de alumnos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial de días pasados / meses
  const fetchHistorialData = async () => {
    if (!selectedGrupoId) return;
    setLoadingHistorial(true);
    try {
      const res = await api.getDocenteAsistenciaHistorial({
        id_grupo: selectedGrupoId,
        id_materia: selectedMateriaId,
        mes: historialMes,
        anio: historialAnio,
      });

      if (res.success) {
        setHistorialData({
          fechas: res.fechas || [],
          alumnos: res.alumnos || [],
        });
      }
    } catch (err) {
      console.error('Error al cargar historial de asistencia:', err);
      showToast('Error al cargar historial de asistencias.', 'error');
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diario') {
      fetchAsistenciaData();
    } else {
      fetchHistorialData();
    }
  }, [selectedGrupoId, selectedMateriaId, selectedFecha, activeTab, historialMes, historialAnio]);

  // Helper para obtener el nombre del día en español (Lunes, Martes, Miércoles, Jueves, etc.)
  const getDiaNombreYFecha = (fechaStr) => {
    if (!fechaStr) return '';
    const d = new Date(fechaStr + 'T12:00:00');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };

  // Cambiar estado de asistencia de un alumno individual
  const handleEstadoAsistenciaChange = (id_alumno, nuevoEstado) => {
    setAlumnos((prev) =>
      prev.map((al) => (al.id_alumno === id_alumno ? { ...al, asistencia_hoy: nuevoEstado } : al))
    );
  };

  // Cambiar observación
  const handleObsChange = (id_alumno, obs) => {
    setAlumnos((prev) =>
      prev.map((al) => (al.id_alumno === id_alumno ? { ...al, obs_asistencia: obs } : al))
    );
  };

  // Marcar a todos como Presentes
  const handleMarcarTodosPresentes = () => {
    setAlumnos((prev) => prev.map((al) => ({ ...al, asistencia_hoy: 'Presente' })));
    showToast('Todos los alumnos marcados como Presentes.', 'info');
  };

  // Guardar lista de asistencia
  const handleGuardarAsistencia = async () => {
    if (!selectedGrupoId || alumnos.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        id_grupo: selectedGrupoId,
        id_materia: selectedMateriaId,
        fecha: selectedFecha,
        asistencias: alumnos.map((al) => ({
          id_alumno: al.id_alumno,
          estado_asistencia: al.asistencia_hoy || 'Presente',
          observaciones: al.obs_asistencia || '',
        })),
      };

      const res = await api.guardarDocenteAsistencia(payload);
      if (res.success) {
        let msg = res.message || 'Pase de lista guardado con éxito.';
        if (res.alertasGeneradas > 0) {
          msg += ` Se generaron ${res.alertasGeneradas} alerta(s) por inasistencias o acumulación de 3 faltas.`;
        }
        showToast(msg, 'success');
        fetchAsistenciaData();
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar asistencia.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Exportar historial a archivo Excel (.xlsx) funcional con o sin internet
  const handleExportExcel = () => {
    if (!historialData.alumnos || historialData.alumnos.length === 0) {
      showToast('No hay datos de asistencia para exportar en este periodo.', 'warning');
      return;
    }

    try {
      const grupoActual = asignaciones.find((a) => a.id_grupo === selectedGrupoId);
      const nombreGrupo = grupoActual?.nombre_grupo || 'Grupo';

      // Construir encabezados
      const headers = ['N°', 'Apellidos y Nombre', 'CURP'];
      historialData.fechas.forEach((f) => {
        headers.push(`${f.diaNombre.slice(0, 3)} ${f.diaNumero}`);
      });
      headers.push('Asistencias (P)', 'Retardos (R)', 'Justificadas (FJ)', 'Faltas (FI)', '% Asistencia');

      // Filas de datos
      const dataRows = historialData.alumnos.map((al, idx) => {
        const row = [idx + 1, `${al.apellidos || ''} ${al.nombre || ''}`.trim(), al.curp || ''];

        historialData.fechas.forEach((f) => {
          const reg = al.asistenciasPorFecha[f.fecha];
          let codigo = '-';
          if (reg) {
            if (reg.estado === 'Presente') codigo = 'P';
            else if (reg.estado === 'Retardo') codigo = 'R';
            else if (reg.estado === 'Justificada') codigo = 'FJ';
            else if (reg.estado === 'Falta Injustificada' || reg.estado === 'Falta') codigo = 'FI';
          }
          row.push(codigo);
        });

        row.push(
          al.totales.presentes,
          al.totales.retardos,
          al.totales.justificadas,
          al.totales.faltas,
          `${al.totales.porcentajeAsistencia}%`
        );
        return row;
      });

      const worksheetData = [
        [`SICARA - LISTA Y CONTROL MENSUAL DE ASISTENCIA ESCOLAR`],
        [`Plantel: ${docente?.nombre_escuela || 'Escuela'} | CCT: ${docente?.cct || ''}`],
        [`Grupo: ${nombreGrupo} | Docente: ${docente?.nombre} ${docente?.apellidos || ''}`],
        [`Periodo: Mes ${historialMes} del ${historialAnio}`],
        [],
        headers,
        ...dataRows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

      const cleanFileName = `Asistencia_${nombreGrupo.replace(/\s+/g, '_')}_Mes${historialMes}_${historialAnio}.xlsx`;
      XLSX.writeFile(wb, cleanFileName);

      showToast(`Lista de asistencia exportada exitosamente a ${cleanFileName}`, 'success');
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      showToast('Error al generar el archivo Excel.', 'error');
    }
  };

  // Filtrado de alumnos en pantalla
  const alumnosFiltrados = alumnos.filter((al) => {
    if (filterRango !== 'todos' && al.color !== filterRango) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nomCompleto = `${al.nombre} ${al.apellidos || ''}`.toLowerCase();
      const curp = (al.curp || '').toLowerCase();
      return nomCompleto.includes(q) || curp.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera y Selector de Modo */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-vino-primary" />
            Control Integral de Asistencia y Rendimiento
          </h2>
          <p className="text-xs text-app-muted mt-0.5">
            Registro diario calendarizado por días de la semana, acumulados, historial de meses y exportación en Excel
          </p>
        </div>

        {/* Pestañas de Vista */}
        <div className="flex items-center gap-2 bg-app-bg p-1 rounded-subtle border border-app-border">
          <button
            type="button"
            onClick={() => setActiveTab('diario')}
            className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'diario'
                ? 'bg-vino-primary text-white shadow-xs'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Pase de Lista del Día</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'historial'
                ? 'bg-vino-primary text-white shadow-xs'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial y Acumulados</span>
          </button>
        </div>
      </div>

      {activeTab === 'diario' ? (
        /* ========================================================
           VISTA 1: PASE DE LISTA DIARIO POR FECHA Y DÍA
           ======================================================== */
        <>
          {/* Selector de Grupo, Materia y Fecha con Día de la Semana */}
          <div className="bg-white rounded-card p-4 border border-app-border shadow-soft space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
                  Grupo Escolar
                </label>
                <select
                  value={selectedGrupoId}
                  onChange={(e) => {
                    const gId = e.target.value;
                    setSelectedGrupoId(gId);
                    const asig = asignaciones.find((a) => a.id_grupo === gId);
                    if (asig) setSelectedMateriaId(asig.id_materia);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-medium"
                >
                  {asignaciones.map((asig) => (
                    <option key={asig.id_grupo_docente} value={asig.id_grupo}>
                      {asig.nombre_grupo} ({asig.grado}° - {asig.nombre_materia})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1 flex items-center justify-between">
                  <span>Fecha de Asistencia</span>
                  <span className="text-vino-primary font-bold normal-case">
                    {getDiaNombreYFecha(selectedFecha).split(',')[0]}
                  </span>
                </label>
                <input
                  type="date"
                  value={selectedFecha}
                  onChange={(e) => setSelectedFecha(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
                  Buscar Alumno
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre o CURP..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
                  />
                </div>
              </div>
            </div>

            {/* Banner de fecha seleccionada */}
            <div className="p-3 bg-vino-soft/30 border border-vino-border/50 rounded-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-vino-primary shrink-0" />
                <span className="font-bold text-vino-dark">
                  Pase de lista correspondiente al: {getDiaNombreYFecha(selectedFecha)}
                </span>
              </div>
              <span className="text-[11px] text-app-muted italic">
                * Las asistencias quedan registradas de manera individual y acumulativa para esta fecha exacta.
              </span>
            </div>

            {/* Resumen y Filtro por Rangos de Calificación */}
            <div className="pt-3 border-t border-app-border/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-bold text-app-muted uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-vino-primary" />
                  Rango:
                </span>

                <button
                  onClick={() => setFilterRango('todos')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    filterRango === 'todos'
                      ? 'bg-vino-primary text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-app-muted hover:text-app-text'
                  }`}
                >
                  Todos ({resumen.total})
                </button>

                {/* RANGO VERDE: 10 a 9 */}
                <button
                  onClick={() => setFilterRango('verde')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterRango === 'verde'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Verde: 10 a 9 ({resumen.verde})</span>
                </button>

                {/* RANGO AMARILLO: 8.9 a 7 */}
                <button
                  onClick={() => setFilterRango('amarillo')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterRango === 'amarillo'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Amarillo: 8.9 a 7 ({resumen.amarillo})</span>
                </button>

                {/* RANGO ROJO: 6.9 a 0 */}
                <button
                  onClick={() => setFilterRango('rojo')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterRango === 'rojo'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Rojo: 6.9 a 0 ({resumen.rojo})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarcarTodosPresentes}
                  className="px-3.5 py-1.5 rounded-subtle bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Todos Presentes</span>
                </button>

                <button
                  type="button"
                  onClick={handleGuardarAsistencia}
                  disabled={saving || loading || alumnos.length === 0}
                  className="px-4 py-1.5 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                  <span>{saving ? 'Guardando...' : 'Guardar Pase de Lista'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Banner de regla de alertas por faltas */}
          <div className="p-4 rounded-card bg-amber-500/10 border border-amber-300/80 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                Regla de Alerta Automática por Inasistencias y Alerta Crítica (3 Faltas):
              </p>
              <p className="text-app-text/90">
                • Cada <strong>Falta Injustificada (FI)</strong> genera una alerta individual de seguimiento para el día registrado.
              </p>
              <p className="text-app-text/90">
                • Si el alumno acumula <strong>3 faltas seguidas o 3 inasistencias en el ciclo</strong>, el sistema generará automáticamente una <strong>Alerta de Inasistencia Crítica</strong> para citatorio con tutor legal e intervención inmediata.
              </p>
            </div>
          </div>

          {/* Tabla de Pase de Lista Diario */}
          <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-app-bg/60 border-b border-app-border text-app-muted uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Alumno</th>
                    <th className="py-3 px-4">CURP</th>
                    <th className="py-3 px-4">Rango de Calificación</th>
                    <th className="py-3 px-4 text-center">Promedio</th>
                    <th className="py-3 px-4 text-center">Faltas Acumuladas</th>
                    <th className="py-3 px-4 text-center">Estado de Asistencia</th>
                    <th className="py-3 px-4">Observaciones del Día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/70">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-app-muted">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                        Cargando lista de asistencia del grupo...
                      </td>
                    </tr>
                  ) : alumnosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-app-muted">
                        No se encontraron alumnos para los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    alumnosFiltrados.map((al) => {
                      const estado = al.asistencia_hoy || 'Presente';
                      const faltasAcum = parseInt(al.faltas_injustificadas || '0', 10);

                      return (
                        <tr key={al.id_alumno} className="hover:bg-vino-soft/10 transition-colors">
                          <td className="py-3 px-4 font-bold text-app-text">
                            {al.apellidos}, {al.nombre}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-app-muted">{al.curp}</td>

                          {/* Rango de Calificación */}
                          <td className="py-3 px-4">
                            {al.color === 'verde' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🟢 Sobresaliente (10 - 9)
                              </span>
                            )}
                            {al.color === 'amarillo' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                🟡 Regular (8.9 - 7)
                              </span>
                            )}
                            {al.color === 'rojo' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                🔴 Bajo Rendimiento (6.9 - 0)
                              </span>
                            )}
                            {al.color === 'gray' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                                ⚪ Sin Calificar
                              </span>
                            )}
                          </td>

                          {/* Promedio numérico */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                                al.color === 'verde'
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : al.color === 'amarillo'
                                  ? 'text-amber-700 bg-amber-50'
                                  : al.color === 'rojo'
                                  ? 'text-red-700 bg-red-50'
                                  : 'text-gray-500'
                              }`}
                            >
                              {al.promedio !== null ? al.promedio : '--'}
                            </span>
                          </td>

                          {/* Faltas acumuladas con semáforo */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                faltasAcum >= 3
                                  ? 'bg-red-100 text-red-800 border border-red-300 font-extrabold animate-pulse'
                                  : faltasAcum > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {faltasAcum >= 3 && <AlertTriangle className="w-3 h-3 text-red-600" />}
                              <span>{faltasAcum} faltas</span>
                            </span>
                          </td>

                          {/* Botones de Asistencia */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEstadoAsistenciaChange(al.id_alumno, 'Presente')}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                  estado === 'Presente'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-app-muted'
                                }`}
                                title="Presente"
                              >
                                P
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEstadoAsistenciaChange(al.id_alumno, 'Retardo')}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                  estado === 'Retardo'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-app-muted'
                                }`}
                                title="Retardo"
                              >
                                R
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEstadoAsistenciaChange(al.id_alumno, 'Justificada')}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                  estado === 'Justificada'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-app-muted'
                                }`}
                                title="Falta Justificada"
                              >
                                FJ
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEstadoAsistenciaChange(al.id_alumno, 'Falta Injustificada')}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                  estado === 'Falta Injustificada' || estado === 'Falta'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-app-muted'
                                }`}
                                title="Falta Injustificada (Genera Alerta)"
                              >
                                FI
                              </button>
                            </div>
                          </td>

                          {/* Observaciones */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={al.obs_asistencia || ''}
                              onChange={(e) => handleObsChange(al.id_alumno, e.target.value)}
                              placeholder="Motivo o nota..."
                              className="w-full px-2.5 py-1 text-xs rounded border border-app-border focus:outline-none focus:border-vino-primary bg-white"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ========================================================
           VISTA 2: HISTORIAL COMPLETO DE DÍAS Y MESES + DESCARGAR EXCEL
           ======================================================== */
        <div className="space-y-4">
          {/* Controles de Selección de Mes y Botón Descargar Excel */}
          <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
                  Grupo
                </label>
                <select
                  value={selectedGrupoId}
                  onChange={(e) => setSelectedGrupoId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-subtle border border-app-border bg-white"
                >
                  {asignaciones.map((asig) => (
                    <option key={asig.id_grupo_docente} value={asig.id_grupo}>
                      {asig.nombre_grupo} ({asig.grado}°)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
                  Mes
                </label>
                <select
                  value={historialMes}
                  onChange={(e) => setHistorialMes(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 text-xs rounded-subtle border border-app-border bg-white font-semibold"
                >
                  <option value={1}>Enero</option>
                  <option value={2}>Febrero</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Mayo</option>
                  <option value={6}>Junio</option>
                  <option value={7}>Julio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Septiembre</option>
                  <option value={10}>Octubre</option>
                  <option value={11}>Noviembre</option>
                  <option value={12}>Diciembre</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
                  Año
                </label>
                <input
                  type="number"
                  value={historialAnio}
                  onChange={(e) => setHistorialAnio(parseInt(e.target.value, 10))}
                  className="w-24 px-3 py-1.5 text-xs rounded-subtle border border-app-border bg-white font-mono"
                />
              </div>

              <button
                type="button"
                onClick={fetchHistorialData}
                disabled={loadingHistorial}
                className="mt-4 p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary"
                title="Recargar Historial"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHistorial ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loadingHistorial || historialData.alumnos.length === 0}
              className="px-4 py-2 rounded-subtle bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Descargar Lista en Excel (.xlsx)</span>
            </button>
          </div>

          {/* Matriz Calendario de Asistencia */}
          <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-app-bg/80 sticky top-0 z-10 border-b border-app-border">
                  <tr>
                    <th className="py-3 px-3 min-w-[200px] border-r border-app-border sticky left-0 bg-app-bg z-20 font-bold uppercase tracking-wider text-[11px] text-app-text">
                      Alumno
                    </th>
                    {historialData.fechas.length === 0 ? (
                      <th className="py-3 px-4 text-center text-app-muted italic">
                        No hay fechas con pase de lista en este mes
                      </th>
                    ) : (
                      historialData.fechas.map((f) => (
                        <th
                          key={f.fecha}
                          className="py-2 px-2.5 text-center border-r border-app-border/70 min-w-[55px]"
                        >
                          <div className="font-extrabold text-[10px] text-vino-dark uppercase">
                            {f.diaNombre.slice(0, 3)}
                          </div>
                          <div className="font-mono text-xs font-bold text-app-text">
                            {f.diaNumero}
                          </div>
                        </th>
                      ))
                    )}
                    <th className="py-2 px-2 text-center bg-emerald-50 text-emerald-800 font-bold border-r border-app-border">
                      P
                    </th>
                    <th className="py-2 px-2 text-center bg-amber-50 text-amber-800 font-bold border-r border-app-border">
                      R
                    </th>
                    <th className="py-2 px-2 text-center bg-blue-50 text-blue-800 font-bold border-r border-app-border">
                      FJ
                    </th>
                    <th className="py-2 px-2 text-center bg-red-50 text-red-800 font-bold border-r border-app-border">
                      FI
                    </th>
                    <th className="py-2 px-3 text-center bg-gray-50 text-app-text font-bold">
                      % Asist.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/70">
                  {loadingHistorial ? (
                    <tr>
                      <td colSpan={historialData.fechas.length + 6} className="py-12 text-center text-app-muted">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                        Cargando matriz mensual de asistencia...
                      </td>
                    </tr>
                  ) : historialData.alumnos.length === 0 ? (
                    <tr>
                      <td colSpan={historialData.fechas.length + 6} className="py-12 text-center text-app-muted">
                        No hay alumnos matriculados en este grupo.
                      </td>
                    </tr>
                  ) : (
                    historialData.alumnos.map((al) => (
                      <tr key={al.id_alumno} className="hover:bg-vino-soft/10 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-app-text sticky left-0 bg-white border-r border-app-border z-10 whitespace-nowrap">
                          {al.apellidos}, {al.nombre}
                        </td>

                        {historialData.fechas.map((f) => {
                          const reg = al.asistenciasPorFecha[f.fecha];
                          let badgeBg = 'bg-gray-100 text-gray-400';
                          let code = '-';

                          if (reg) {
                            if (reg.estado === 'Presente') {
                              badgeBg = 'bg-emerald-100 text-emerald-800 font-bold';
                              code = 'P';
                            } else if (reg.estado === 'Retardo') {
                              badgeBg = 'bg-amber-100 text-amber-800 font-bold';
                              code = 'R';
                            } else if (reg.estado === 'Justificada') {
                              badgeBg = 'bg-blue-100 text-blue-800 font-bold';
                              code = 'FJ';
                            } else if (reg.estado === 'Falta Injustificada' || reg.estado === 'Falta') {
                              badgeBg = 'bg-red-100 text-red-800 font-extrabold';
                              code = 'FI';
                            }
                          }

                          return (
                            <td
                              key={f.fecha}
                              className="py-1 px-1 text-center border-r border-app-border/50 text-[11px]"
                            >
                              <span
                                className={`inline-block w-7 py-0.5 rounded text-center font-mono ${badgeBg}`}
                                title={reg?.observaciones || reg?.estado || 'Sin registro'}
                              >
                                {code}
                              </span>
                            </td>
                          );
                        })}

                        {/* Totales Acumulados */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40 border-r border-app-border">
                          {al.totales.presentes}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-amber-700 bg-amber-50/40 border-r border-app-border">
                          {al.totales.retardos}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-700 bg-blue-50/40 border-r border-app-border">
                          {al.totales.justificadas}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-black text-red-700 bg-red-50/40 border-r border-app-border">
                          {al.totales.faltas}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-app-text bg-gray-50/60">
                          {al.totales.porcentajeAsistencia}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
