import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function DocenteAsistenciaView({ docente, asignaciones = [] }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filtros de Asistencia
  const [selectedGrupoId, setSelectedGrupoId] = useState(asignaciones[0]?.id_grupo || '');
  const [selectedMateriaId, setSelectedMateriaId] = useState(asignaciones[0]?.id_materia || '');
  const [selectedFecha, setSelectedFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterRango, setFilterRango] = useState('todos'); // 'todos' | 'verde' | 'amarillo' | 'rojo'
  const [search, setSearch] = useState('');

  // Lista de alumnos y sus asistencias
  const [alumnos, setAlumnos] = useState([]);
  const [resumen, setResumen] = useState({ verde: 0, amarillo: 0, rojo: 0, sinCalificar: 0, total: 0 });

  const primaryColor = docente?.color_primario || '#722F37';

  // Si cambian las asignaciones iniciales, fijar el primer grupo
  useEffect(() => {
    if (!selectedGrupoId && asignaciones.length > 0) {
      setSelectedGrupoId(asignaciones[0].id_grupo);
      setSelectedMateriaId(asignaciones[0].id_materia);
    }
  }, [asignaciones]);

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

  useEffect(() => {
    fetchAsistenciaData();
  }, [selectedGrupoId, selectedMateriaId, selectedFecha]);

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
          msg += ` Se generaron ${res.alertasGeneradas} alerta(s) automática(s) por inasistencia injustificada.`;
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
      {/* Cabecera y acciones */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-vino-primary" />
            Control de Asistencia y Clasificación por Rendimiento
          </h2>
          <p className="text-xs text-app-muted">
            Pase de lista diario con semaforización de calificaciones por rangos de desempeño académico
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarcarTodosPresentes}
            className="px-3.5 py-2 rounded-subtle bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Todos Presentes</span>
          </button>

          <button
            type="button"
            onClick={handleGuardarAsistencia}
            disabled={saving || loading || alumnos.length === 0}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Pase de Lista'}</span>
          </button>
        </div>
      </div>

      {/* Selector de Grupo, Materia y Fecha */}
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
              Fecha de Asistencia
            </label>
            <input
              type="date"
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-mono"
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Verde: 10 a 9 ({resumen.verde})</span>
            </button>

            {/* RANGO AMARILLO: 8.9 a 7.0 */}
            <button
              onClick={() => setFilterRango('amarillo')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterRango === 'amarillo'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Amarillo: 8.9 a 7 ({resumen.amarillo})</span>
            </button>

            {/* RANGO ROJO: 6.9 a 0.0 */}
            <button
              onClick={() => setFilterRango('rojo')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterRango === 'rojo'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Rojo: 6.9 a 0 ({resumen.rojo})</span>
            </button>
          </div>

          <div className="text-[11px] text-app-muted font-medium">
            Alumnos sin calificar: <strong>{resumen.sinCalificar}</strong>
          </div>
        </div>
      </div>

      {/* Aviso de Automatización de Alertas por Inasistencia */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-card p-3 text-xs flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="leading-relaxed">
          <strong>Regla de Alerta Automática:</strong> Al marcar a un alumno con <strong>Falta Injustificada</strong> o <strong>Falta</strong> y guardar el pase de lista, el sistema generará de forma automática una alerta docente para seguimiento pedagógico inmediato.
        </p>
      </div>

      {/* Tabla de Alumnos con Semaforización de Rendimiento y Asistencia */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">CURP</th>
                <th className="py-3 px-4 text-center">Rango de Calificación</th>
                <th className="py-3 px-4 text-center">Promedio</th>
                <th className="py-3 px-4 text-center">Estado de Asistencia</th>
                <th className="py-3 px-4">Observaciones del Día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-app-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                    Cargando lista de alumnos...
                  </td>
                </tr>
              ) : alumnosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-app-muted">
                    No se encontraron alumnos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                alumnosFiltrados.map((al) => {
                  const estado = al.asistencia_hoy || 'Presente';
                  return (
                    <tr
                      key={al.id_alumno}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        al.color === 'rojo'
                          ? 'bg-red-50/30'
                          : al.color === 'amarillo'
                          ? 'bg-amber-50/20'
                          : al.color === 'verde'
                          ? 'bg-emerald-50/20'
                          : ''
                      }`}
                    >
                      {/* Alumno */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-app-text text-sm flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              al.color === 'verde'
                                ? 'bg-emerald-500'
                                : al.color === 'amarillo'
                                ? 'bg-amber-500'
                                : al.color === 'rojo'
                                ? 'bg-red-500'
                                : 'bg-gray-300'
                            }`}
                          />
                          <span>
                            {al.apellidos ? `${al.apellidos}, ` : ''}{al.nombre}
                          </span>
                        </div>
                        {al.faltas_injustificadas > 0 && (
                          <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
                            ⚠️ {al.faltas_injustificadas} falta(s) previas registradas
                          </span>
                        )}
                      </td>

                      {/* CURP */}
                      <td className="py-3 px-4 font-mono text-[11px] text-app-muted">
                        {al.curp || 'S/C'}
                      </td>

                      {/* Rango de Calificación con Colores Solicitados */}
                      <td className="py-3 px-4 text-center">
                        {al.color === 'verde' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 Rango Verde (10 - 9)
                          </span>
                        )}
                        {al.color === 'amarillo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            🟡 Rango Amarillo (8.9 - 7)
                          </span>
                        )}
                        {al.color === 'rojo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            🔴 Rango Rojo (6.9 - 0)
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
    </div>
  );
}

