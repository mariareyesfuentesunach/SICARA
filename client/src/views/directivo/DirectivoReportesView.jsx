import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  Layers,
  Users,
  Award,
  AlertTriangle,
  Printer,
  CheckCircle,
} from 'lucide-react';

export default function DirectivoReportesView({ escuela }) {
  const { showToast } = useToast();
  const [reportesHistorial, setReportesHistorial] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Formulario de generación
  const [reportParams, setReportParams] = useState({
    tipo_reporte: 'alumnos_general',
    periodo: 'Ciclo Escolar 2024-2025',
    id_grupo: '',
    descripcion: '',
  });

  // Modal Vista Previa / Exportación
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeReportData, setActiveReportData] = useState(null);

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, grpRes] = await Promise.all([
        api.getDirectivoReportes(),
        api.getDirectivoGrupos(),
      ]);

      if (repRes.success) setReportesHistorial(repRes.reportes || []);
      if (grpRes.success) setGrupos(grpRes.grupos || []);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      showToast('Error al cargar historial de reportes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.generarDirectivoReporte(reportParams);
      if (res.success) {
        showToast('Reporte generado exitosamente.', 'success');
        setActiveReportData({
          tipo: reportParams.tipo_reporte,
          periodo: reportParams.periodo,
          datos: res.datos,
          fecha: new Date().toLocaleString('es-MX'),
        });
        setShowPreviewModal(true);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Error al generar reporte.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintOrPdf = () => {
    window.print();
  };

  const reportTypes = [
    { id: 'alumnos_general', label: 'Reporte General de Alumnos' },
    { id: 'docentes_general', label: 'Reporte de Docentes del Plantel' },
    { id: 'alumnos_por_grupo', label: 'Reporte de Alumnos por Grupo' },
    { id: 'asistencia', label: 'Reporte General de Asistencia' },
    { id: 'inasistencias', label: 'Reporte Específico de Inasistencias' },
    { id: 'calificaciones', label: 'Reporte de Calificaciones' },
    { id: 'rendimiento_academico', label: 'Reporte de Rendimiento Académico' },
    { id: 'alertas', label: 'Reporte de Alertas Escolares' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-vino-primary" />
            Centro de Reportes Institucionales
          </h2>
          <p className="text-xs text-app-muted">
            Generación oficial, visualización y exportación de listas, asistencias y evaluaciones
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start md:self-auto px-3 py-2 rounded-card border border-app-border bg-white text-app-text hover:bg-gray-50 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Historial</span>
        </button>
      </div>

      {/* Tarjeta de Generación de Reporte */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft">
        <h3 className="text-sm font-bold text-app-text mb-1">Configurar y Generar Nuevo Reporte</h3>
        <p className="text-xs text-app-muted mb-4">
          Seleccione el formato, periodo escolar y grupo deseado para procesar la información
        </p>

        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Tipo de Reporte <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={reportParams.tipo_reporte}
              onChange={(e) => setReportParams({ ...reportParams, tipo_reporte: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              {reportTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Periodo / Ciclo
            </label>
            <input
              type="text"
              value={reportParams.periodo}
              onChange={(e) => setReportParams({ ...reportParams, periodo: e.target.value })}
              placeholder="Ej. Ciclo 2024-2025, 1er Trimestre"
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Grupo (opcional)
            </label>
            <select
              value={reportParams.id_grupo}
              onChange={(e) => setReportParams({ ...reportParams, id_grupo: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Toda la escuela</option>
              {grupos.map((g) => (
                <option key={g.id_grupo} value={g.id_grupo}>
                  {g.nombre_grupo} ({g.grado}°)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={generating}
              style={{ backgroundColor: primaryColor }}
              className="w-full py-2 px-4 rounded-subtle text-white font-bold text-xs shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{generating ? 'Generando...' : 'Generar Reporte'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historial de Reportes Generados */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="p-4 border-b border-app-border bg-gray-50/75 flex justify-between items-center">
          <h3 className="font-bold text-app-text text-xs uppercase tracking-wider">
            Bitácora de Reportes Generados
          </h3>
          <span className="text-[11px] text-app-muted">Auditoría institucional</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border text-app-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tipo de Reporte</th>
                <th className="py-3 px-4">Periodo</th>
                <th className="py-3 px-4">Generado Por</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-app-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-vino-primary" />
                    Cargando bitácora...
                  </td>
                </tr>
              ) : reportesHistorial.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-app-muted">
                    No se han generado reportes en esta sesión institucional.
                  </td>
                </tr>
              ) : (
                reportesHistorial.map((rep) => (
                  <tr key={rep.id_reporte} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-app-text">
                      {rep.tipo_reporte}
                    </td>
                    <td className="py-3 px-4 text-app-muted">{rep.periodo}</td>
                    <td className="py-3 px-4 font-semibold text-app-text">
                      {rep.generado_por || 'Directivo'}
                    </td>
                    <td className="py-3 px-4 text-app-muted font-mono text-[11px]">
                      {new Date(rep.fecha_generacion).toLocaleString('es-MX')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Generado
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Visualización y Exportación de Reporte Generado */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Visualización de Reporte Oficial"
        subtitle={`Institución: ${escuela?.nombre_escuela || 'Plantel'} • Generado: ${activeReportData?.fecha || ''}`}
        maxWidth="max-w-3xl"
        footer={
          <>
            <button
              onClick={handlePrintOrPdf}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar como PDF</span>
            </button>
            <button
              onClick={() => setShowPreviewModal(false)}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              Cerrar
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Encabezado del reporte impreso */}
          <div className="p-4 bg-gray-50 rounded-card border border-app-border flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-app-text">
                {escuela?.nombre_escuela || 'Institución Rural SICARA'}
              </h2>
              <p className="text-[11px] text-app-muted">
                CCT: {escuela?.cct || 'S/N'} • Nivel: {escuela?.nivel_educativo || 'Primaria'} • Turno: {escuela?.turno || 'Matutino'}
              </p>
              <p className="text-xs font-bold text-vino-primary mt-1 uppercase tracking-wide">
                {activeReportData?.tipo?.replace(/_/g, ' ')} ({activeReportData?.periodo})
              </p>
            </div>
            <div className="text-right text-[11px] text-app-muted">
              <span className="font-bold text-app-text block font-mono text-sm">
                Total Registros: {activeReportData?.datos?.total || 0}
              </span>
              <span>Emisión: {activeReportData?.fecha}</span>
            </div>
          </div>

          {/* Tabla de registros del reporte */}
          <div className="border border-app-border rounded-subtle overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-app-muted font-bold text-[11px] sticky top-0">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Nombre / Identificador</th>
                  <th className="p-2.5">Detalles</th>
                  <th className="p-2.5">Estado / Clasificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {(!activeReportData?.datos?.lista || activeReportData.datos.lista.length === 0) ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-app-muted italic">
                      No se encontraron registros en el periodo seleccionado.
                    </td>
                  </tr>
                ) : (
                  activeReportData.datos.lista.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 font-mono text-app-muted">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-app-text">
                        {item.nombre || item.alumno_nombre || item.nombre_grupo || item.tipo_alerta}
                        {item.apellidos ? ` ${item.apellidos}` : ''}
                      </td>
                      <td className="p-2.5 text-app-muted">
                        {item.curp || item.descripcion || item.correo || (item.fecha ? new Date(item.fecha).toLocaleDateString('es-MX') : 'S/D')}
                      </td>
                      <td className="p-2.5">
                        <span className="font-semibold text-app-text">
                          {item.estado || item.estado_asistencia || item.estado_alerta || (item.calificacion ? `Calificación: ${item.calificacion}` : 'Activo')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}

