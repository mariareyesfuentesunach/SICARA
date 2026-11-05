import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  TrendingUp,
  Search,
  RefreshCw,
  Award,
  CalendarCheck,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function DirectivoRendimientoView({ escuela }) {
  const { showToast } = useToast();
  const [rendimiento, setRendimiento] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('todos');
  const [search, setSearch] = useState('');

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rendRes, grpRes] = await Promise.all([
        api.getDirectivoRendimiento({
          id_grupo: filterGrupo,
          grado: filterGrado,
          periodo: filterPeriodo,
          q: search,
        }),
        api.getDirectivoGrupos(),
      ]);

      if (rendRes.success) setRendimiento(rendRes.rendimiento || []);
      if (grpRes.success) setGrupos(grpRes.grupos || []);
    } catch (err) {
      console.error('Error rendimiento:', err);
      showToast('Error al consultar rendimiento académico.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterGrupo, filterGrado, filterPeriodo]);

  // Cálculos resumen de la vista
  const alumnosConPromedio = rendimiento.filter((r) => r.promedio !== null);
  const promedioGlobal =
    alumnosConPromedio.length > 0
      ? (
          alumnosConPromedio.reduce((acc, curr) => acc + Number(curr.promedio), 0) /
          alumnosConPromedio.length
        ).toFixed(1)
      : 'S/C';

  const asistenciaGlobal =
    rendimiento.length > 0
      ? Math.round(
          rendimiento.reduce((acc, curr) => acc + (Number(curr.porcentaje_asistencia) || 100), 0) /
            rendimiento.length
        )
      : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-vino-primary" />
            Rendimiento Académico y Asistencia
          </h2>
          <p className="text-xs text-app-muted">
            Consolidado escolar computado a partir de calificaciones y control de asistencias de la institución
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 px-3 rounded-card bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-700" />
            <div>
              <p className="text-[10px] text-emerald-800 font-bold uppercase leading-none">
                Asistencia Media
              </p>
              <p className="text-sm font-bold text-emerald-900 leading-tight mt-0.5 font-mono">
                {asistenciaGlobal}%
              </p>
            </div>
          </div>

          <div className="p-2.5 px-3 rounded-card bg-purple-50 border border-purple-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-700" />
            <div>
              <p className="text-[10px] text-purple-800 font-bold uppercase leading-none">
                Promedio Plantel
              </p>
              <p className="text-sm font-bold text-purple-900 leading-tight mt-0.5 font-mono">
                {promedioGlobal}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData();
          }}
          className="relative flex-1 min-w-[200px]"
        >
          <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre del alumno..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
          />
        </form>

        <select
          value={filterGrado}
          onChange={(e) => setFilterGrado(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
        >
          <option value="">Todos los grados</option>
          <option value="1">1° Grado</option>
          <option value="2">2° Grado</option>
          <option value="3">3° Grado</option>
          <option value="4">4° Grado</option>
          <option value="5">5° Grado</option>
          <option value="6">6° Grado</option>
        </select>

        <select
          value={filterGrupo}
          onChange={(e) => setFilterGrupo(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
        >
          <option value="">Todos los grupos</option>
          {grupos.map((g) => (
            <option key={g.id_grupo} value={g.id_grupo}>
              {g.nombre_grupo} ({g.grado}°)
            </option>
          ))}
        </select>

        <select
          value={filterPeriodo}
          onChange={(e) => setFilterPeriodo(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
        >
          <option value="todos">Todos los periodos</option>
          <option value="1er Trimestre">1er Trimestre</option>
          <option value="2do Trimestre">2do Trimestre</option>
          <option value="3er Trimestre">3er Trimestre</option>
        </select>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
          title="Recargar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabla de Rendimiento */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">Grupo / Grado</th>
                <th className="py-3 px-4">Periodo</th>
                <th className="py-3 px-4 text-center">Asistencia</th>
                <th className="py-3 px-4 text-center">Promedio</th>
                <th className="py-3 px-4 text-right">Nivel de Rendimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-app-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                    Calculando rendimiento y métricas de asistencia...
                  </td>
                </tr>
              ) : rendimiento.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-app-muted">
                    No se encontraron registros de rendimiento para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                rendimiento.map((item, idx) => (
                  <tr key={`${item.id_alumno}-${idx}`} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-app-text">{item.alumno_nombre}</div>
                      <div className="font-mono text-[10px] text-app-muted">{item.curp || 'S/C'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-app-text">{item.nombre_grupo}</span>
                      <span className="text-[10px] text-app-muted ml-1">({item.grado}°)</span>
                    </td>
                    <td className="py-3 px-4 text-app-muted">{item.periodo}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          Number(item.porcentaje_asistencia) < 80
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.porcentaje_asistencia ? `${item.porcentaje_asistencia}%` : '100%'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold font-mono text-sm px-2.5 py-0.5 rounded bg-gray-100 text-app-text border border-app-border">
                        {item.promedio !== null ? item.promedio : 'S/C'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.nivel_rendimiento === 'Excelente'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.nivel_rendimiento === 'Bueno'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : item.nivel_rendimiento === 'Regular'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : item.nivel_rendimiento === 'En Riesgo'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.nivel_rendimiento === 'Excelente' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {item.nivel_rendimiento === 'En Riesgo' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                        {item.nivel_rendimiento}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

