import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  FileSpreadsheet,
  PlusCircle,
  Search,
  RefreshCw,
  User,
  Layers,
  Calendar,
  AlertTriangle,
  FileText,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function DocenteReportesView({ docente, asignaciones = [], preloadedAlumno = null }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportes, setReportes] = useState([]);
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
  const [search, setSearch] = useState('');

  // Modal Crear Reporte
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    id_grupo: '',
    id_alumno: '',
    tipo_reporte: 'Bajo Rendimiento Académico',
    periodo: 'Periodo 1',
    descripcion: '',
    medidas_pedagogicas: '',
    recomendaciones: '',
  });

  // Modal Ver Detalle
  const [viewingReporte, setViewingReporte] = useState(null);

  const primaryColor = docente?.color_primario || '#722F37';

  const fetchReportes = async () => {
    setLoading(true);
    try {
      const res = await api.getDocenteReportes();
      if (res.success) {
        setReportes(res.reportes || []);
      }
    } catch (err) {
      console.error('Error al listar reportes:', err);
      showToast('Error al cargar reportes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, []);

  // Si viene preloadedAlumno de una alerta
  useEffect(() => {
    if (preloadedAlumno) {
      setFormData({
        id_grupo: preloadedAlumno.id_grupo || '',
        id_alumno: preloadedAlumno.id_alumno || '',
        tipo_reporte: 'Bajo Rendimiento Académico',
        periodo: 'Periodo 1',
        descripcion: `Reporte de seguimiento por alerta: ${preloadedAlumno.descripcion || ''}`,
        medidas_pedagogicas: '',
        recomendaciones: '',
      });
      setShowModal(true);
      if (preloadedAlumno.id_grupo) {
        cargarAlumnosDeGrupo(preloadedAlumno.id_grupo);
      }
    }
  }, [preloadedAlumno]);

  const cargarAlumnosDeGrupo = async (id_grupo) => {
    try {
      const res = await api.getDocenteAsistencia({ id_grupo });
      if (res.success) {
        setAlumnosDisponibles(res.alumnos || []);
      }
    } catch (e) {
      console.warn('Error cargando alumnos de grupo:', e);
    }
  };

  const handleOpenCreate = () => {
    const defaultGrupo = asignaciones[0]?.id_grupo || '';
    setFormData({
      id_grupo: defaultGrupo,
      id_alumno: '',
      tipo_reporte: 'Bajo Rendimiento Académico',
      periodo: 'Periodo 1',
      descripcion: '',
      medidas_pedagogicas: '',
      recomendaciones: '',
    });
    if (defaultGrupo) {
      cargarAlumnosDeGrupo(defaultGrupo);
    }
    setShowModal(true);
  };

  const handleGrupoChange = (e) => {
    const gId = e.target.value;
    setFormData((prev) => ({ ...prev, id_grupo: gId, id_alumno: '' }));
    if (gId) {
      cargarAlumnosDeGrupo(gId);
    } else {
      setAlumnosDisponibles([]);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      showToast('Debe ingresar la descripción y motivos del reporte.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.crearDocenteReporte(formData);
      if (res.success) {
        showToast('Reporte pedagógico generado y registrado con éxito.', 'success');
        setShowModal(false);
        fetchReportes();
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar reporte.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const reportesFiltrados = reportes.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const desc = (r.descripcion || '').toLowerCase();
    const tipo = (r.tipo_reporte || '').toLowerCase();
    const jsonStr = JSON.stringify(r.datos_json || {}).toLowerCase();
    return desc.includes(q) || tipo.includes(q) || jsonStr.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-vino-primary" />
            Reportes Pedagógicos y de Rendimiento Académico
          </h2>
          <p className="text-xs text-app-muted">
            Generación de actas, informes de reforzamiento escolar y seguimiento a alumnos en rango crítico
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{ backgroundColor: primaryColor }}
          className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Generar Reporte</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción, alumno o periodo..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
          />
        </div>

        <button
          onClick={fetchReportes}
          disabled={loading}
          className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
          title="Recargar reportes"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Lista de Reportes */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Tipo de Reporte</th>
                <th className="py-3 px-4">Alumno y Grupo</th>
                <th className="py-3 px-4">Periodo</th>
                <th className="py-3 px-4">Descripción / Diagnóstico</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-app-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                    Cargando reportes generados...
                  </td>
                </tr>
              ) : reportesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-app-muted">
                    No ha generado reportes de bajo rendimiento aún.
                  </td>
                </tr>
              ) : (
                reportesFiltrados.map((rep) => {
                  const datos = rep.datos_json || {};
                  return (
                    <tr key={rep.id_reporte} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <FileText className="w-3 h-3 text-purple-600" />
                          {rep.tipo_reporte}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-app-text">{datos.alumno || 'General'}</div>
                        <div className="text-[10px] text-app-muted">
                          {datos.grupo || 'Grupo no especificado'} {datos.curp ? `• ${datos.curp}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-app-text">
                        {rep.periodo || 'Periodo Actual'}
                      </td>

                      <td className="py-3 px-4 text-app-muted max-w-xs truncate">
                        {rep.descripcion}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-app-muted">
                        {rep.fecha_generacion ? new Date(rep.fecha_generacion).toLocaleDateString('es-MX') : ''}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setViewingReporte(rep)}
                          className="px-2.5 py-1 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Ficha</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear Reporte */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Generar Reporte Pedagógico de Alumno"
        subtitle="Expida un informe de bajo aprovechamiento, inasistencias o medidas de regularización"
        maxWidth="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-reporte-docente"
              disabled={actionLoading}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Guardando...' : 'Emitir Reporte'}
            </button>
          </>
        }
      >
        <form id="form-reporte-docente" onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Grupo Escolar <span className="text-status-error">*</span>
              </label>
              <select
                required
                value={formData.id_grupo}
                onChange={handleGrupoChange}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs font-medium"
              >
                <option value="">Seleccione grupo...</option>
                {asignaciones.map((asig) => (
                  <option key={asig.id_grupo_docente} value={asig.id_grupo}>
                    {asig.nombre_grupo} ({asig.grado}° - {asig.nombre_materia})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Alumno Específico
              </label>
              <select
                value={formData.id_alumno}
                onChange={(e) => setFormData({ ...formData, id_alumno: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs font-medium"
              >
                <option value="">Todos / Todo el grupo</option>
                {alumnosDisponibles.map((al) => (
                  <option key={al.id_alumno} value={al.id_alumno}>
                    {al.nombre} {al.apellidos} {al.promedio !== null ? `(Prom: ${al.promedio})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Tipo de Reporte
              </label>
              <select
                value={formData.tipo_reporte}
                onChange={(e) => setFormData({ ...formData, tipo_reporte: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
              >
                <option value="Bajo Rendimiento Académico">Bajo Rendimiento Académico</option>
                <option value="Inasistencia Recurrente">Inasistencia Recurrente</option>
                <option value="Conducta y Cumplimiento">Conducta y Cumplimiento</option>
                <option value="Plan de Regularización">Plan de Regularización</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Periodo
              </label>
              <select
                value={formData.periodo}
                onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
              >
                <option value="Periodo 1">Trimestre 1</option>
                <option value="Periodo 2">Trimestre 2</option>
                <option value="Periodo 3">Trimestre 3</option>
                <option value="Extraordinario">Periodo Extraordinario</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Diagnóstico / Descripción de la Situación <span className="text-status-error">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describa los motivos del reporte, áreas con dificultades y antecedentes observados..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Medidas Pedagógicas Aplicadas o Acordadas
            </label>
            <textarea
              rows={2}
              value={formData.medidas_pedagogicas}
              onChange={(e) => setFormData({ ...formData, medidas_pedagogicas: e.target.value })}
              placeholder="Ej. Tareas de reforzamiento, tutoría individual, canalización a dirección..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Recomendaciones para Padres / Tutores
            </label>
            <input
              type="text"
              value={formData.recomendaciones}
              onChange={(e) => setFormData({ ...formData, recomendaciones: e.target.value })}
              placeholder="Ej. Supervisión diaria del cuaderno de tareas y asistencia puntual..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>
        </form>
      </Modal>

      {/* MODAL: Ver Ficha de Reporte */}
      <Modal
        isOpen={!!viewingReporte}
        onClose={() => setViewingReporte(null)}
        title="Ficha Oficial de Reporte Pedagógico"
        subtitle={`Expedido el ${viewingReporte?.fecha_generacion ? new Date(viewingReporte.fecha_generacion).toLocaleDateString('es-MX') : ''}`}
        maxWidth="max-w-lg"
        footer={
          <button
            onClick={() => setViewingReporte(null)}
            className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
          >
            Cerrar Ficha
          </button>
        }
      >
        {viewingReporte && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-card bg-gray-50 border border-app-border space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-app-text uppercase text-[10px]">Tipo de Informe:</span>
                <span className="font-bold text-vino-primary">{viewingReporte.tipo_reporte}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-app-text uppercase text-[10px]">Alumno:</span>
                <span className="font-bold text-app-text">{viewingReporte.datos_json?.alumno || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-app-text uppercase text-[10px]">Grupo:</span>
                <span className="text-app-muted">{viewingReporte.datos_json?.grupo || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-app-text uppercase text-[10px]">Docente Emisor:</span>
                <span className="text-app-muted">{viewingReporte.datos_json?.docente || docente?.nombre}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-app-text uppercase tracking-wider text-[11px] mb-1">
                Descripción y Diagnóstico:
              </h4>
              <p className="p-3 bg-white border border-app-border rounded-subtle text-app-text leading-relaxed">
                {viewingReporte.descripcion}
              </p>
            </div>

            {viewingReporte.datos_json?.medidas_pedagogicas && (
              <div>
                <h4 className="font-bold text-app-text uppercase tracking-wider text-[11px] mb-1">
                  Medidas Pedagógicas Tomadas:
                </h4>
                <p className="p-3 bg-white border border-app-border rounded-subtle text-app-text leading-relaxed">
                  {viewingReporte.datos_json.medidas_pedagogicas}
                </p>
              </div>
            )}

            {viewingReporte.datos_json?.recomendaciones && (
              <div>
                <h4 className="font-bold text-app-text uppercase tracking-wider text-[11px] mb-1">
                  Recomendaciones:
                </h4>
                <p className="p-3 bg-white border border-app-border rounded-subtle text-app-text leading-relaxed">
                  {viewingReporte.datos_json.recomendaciones}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

