import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import CsvImportSection from '../../components/directivo/CsvImportSection';
import EliminarModalDirectivo from '../../components/directivo/EliminarModalDirectivo';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Eye,
  Trash2,
  FileText,
  Calendar,
  AlertTriangle,
  Award,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

export default function DirectivoAlumnosView({ escuela }) {
  const { showToast } = useToast();
  const [alumnos, setAlumnos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterGrupo, setFilterGrupo] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('manual'); // 'manual' | 'csv'
  const [editingAlumno, setEditingAlumno] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    curp: '',
    fecha_nacimiento: '',
    estado: 'Activo',
    id_grupo: '',
  });

  // Modal Historial
  const [historialAlumno, setHistorialAlumno] = useState(null);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Modal Eliminación Lógica
  const [alumnoToDelete, setAlumnoToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleConfirmDeleteAlumno = async () => {
    if (!alumnoToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.deleteDirectivoAlumno(alumnoToDelete.id_alumno);
      if (res.success) {
        showToast(res.message, 'success');
        setShowDeleteModal(false);
        setAlumnoToDelete(null);
        fetchData();
      } else {
        showToast(res.message || 'Error al eliminar alumno del sistema.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error de comunicación al eliminar alumno.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alumnosRes, gruposRes] = await Promise.all([
        api.getDirectivoAlumnos({
          q: search,
          estado: filterEstado,
          id_grupo: filterGrupo,
        }),
        api.getDirectivoGrupos(),
      ]);

      if (alumnosRes.success) setAlumnos(alumnosRes.alumnos || []);
      if (gruposRes.success) setGrupos(gruposRes.grupos || []);
    } catch (err) {
      console.error('Error al cargar alumnos:', err);
      showToast('Error al cargar lista de alumnos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterEstado, filterGrupo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenCreate = () => {
    setEditingAlumno(null);
    setModalTab('manual');
    setFormData({
      nombre: '',
      apellidos: '',
      curp: '',
      fecha_nacimiento: '',
      estado: 'Activo',
      id_grupo: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (al) => {
    setEditingAlumno(al);
    setModalTab('manual');
    setFormData({
      nombre: al.nombre || '',
      apellidos: al.apellidos || '',
      curp: al.curp || '',
      fecha_nacimiento: al.fecha_nacimiento ? al.fecha_nacimiento.split('T')[0] : '',
      estado: al.estado || 'Activo',
      id_grupo: al.id_grupo || '',
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      showToast('El nombre del alumno es obligatorio.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      if (editingAlumno) {
        const res = await api.updateDirectivoAlumno(editingAlumno.id_alumno, formData);
        if (res.success) {
          showToast('Alumno actualizado exitosamente.', 'success');
          setShowModal(false);
          fetchData();
        }
      } else {
        const res = await api.createDirectivoAlumno(formData);
        if (res.success) {
          showToast('Alumno registrado exitosamente.', 'success');
          setShowModal(false);
          fetchData();
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar alumno.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenHistorial = async (alumno) => {
    setLoadingHistorial(true);
    setShowHistorialModal(true);
    try {
      const res = await api.getDirectivoAlumnoHistorial(alumno.id_alumno);
      if (res.success) {
        setHistorialAlumno(res);
      }
    } catch (err) {
      showToast('Error al cargar historial del alumno.', 'error');
    } finally {
      setLoadingHistorial(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de cabecera y búsqueda */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <Users className="w-5 h-5 text-vino-primary" />
            Catálogo de Alumnos
          </h2>
          <p className="text-xs text-app-muted">
            Registro, inscripción a grupos y seguimiento del historial académico
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{ backgroundColor: primaryColor }}
          className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Alumno</span>
        </button>
      </div>

      {/* Filtros y buscador */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellidos o CURP..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
          />
        </form>

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
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
        >
          <option value="todos">Todos los estados</option>
          <option value="Activo">Activos</option>
          <option value="Inactivo">Inactivos</option>
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

      {/* Tabla de Alumnos */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">CURP</th>
                <th className="py-3 px-4">Grupo Asignado</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-app-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                    Cargando matrícula de alumnos...
                  </td>
                </tr>
              ) : alumnos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-app-muted">
                    No se encontraron alumnos registrados con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                alumnos.map((al) => (
                  <tr key={al.id_alumno} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-app-text">
                        {al.nombre} {al.apellidos}
                      </div>
                      <div className="text-[10px] text-app-muted">
                        {al.fecha_nacimiento
                          ? `Nac: ${new Date(al.fecha_nacimiento).toLocaleDateString('es-MX')}`
                          : 'Sin fecha de nac.'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-app-text">
                      {al.curp || <span className="text-app-muted italic">S/C</span>}
                    </td>
                    <td className="py-3 px-4">
                      {al.nombre_grupo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Layers className="w-3 h-3" />
                          {al.nombre_grupo} ({al.grado}°)
                        </span>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-semibold">
                          Sin grupo asignado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={al.estado || 'Activo'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenHistorial(al)}
                          className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
                          title="Ver historial académico"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(al)}
                          className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
                          title="Editar información"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAlumnoToDelete(al);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-subtle hover:bg-rose-50 text-app-muted hover:text-rose-600 transition-colors cursor-pointer"
                          title="Eliminar del sistema"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Registrar / Editar Alumno */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAlumno ? 'Editar Alumno' : 'Registrar / Importar Alumnos'}
        subtitle={
          editingAlumno
            ? 'Complete los datos del alumno de acuerdo con su registro oficial'
            : 'Registre un alumno manualmente o importe múltiples alumnos desde un archivo CSV (Excel)'
        }
        maxWidth={modalTab === 'csv' ? 'max-w-2xl' : 'max-w-xl'}
        footer={
          modalTab === 'manual' ? (
            <>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-alumno"
                disabled={actionLoading}
                style={{ backgroundColor: primaryColor }}
                className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Alumno'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
            >
              Cerrar
            </button>
          )
        }
      >
        {/* Selector de pestañas si no se está editando */}
        {!editingAlumno && (
          <div className="flex border-b border-app-border mb-4">
            <button
              type="button"
              onClick={() => setModalTab('manual')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalTab === 'manual'
                  ? 'border-vino-primary text-vino-primary bg-vino-soft/30'
                  : 'border-transparent text-app-muted hover:text-app-text'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registro Individual</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('csv')}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                modalTab === 'csv'
                  ? 'border-vino-primary text-vino-primary bg-vino-soft/30'
                  : 'border-transparent text-app-muted hover:text-app-text'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar CSV (Excel)</span>
            </button>
          </div>
        )}

        {modalTab === 'manual' ? (
          <form id="form-alumno" onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Nombre(s) <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Sofía"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  placeholder="Ej. Hernández Cruz"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  CURP (18 caracteres)
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={formData.curp}
                  onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                  placeholder="Ej. HECS130418MOCRRFO8"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary font-mono text-xs uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Grupo de Inscripción
                </label>
                <select
                  value={formData.id_grupo}
                  onChange={(e) => setFormData({ ...formData, id_grupo: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
                >
                  <option value="">Sin grupo asignado</option>
                  {grupos.map((g) => (
                    <option key={g.id_grupo} value={g.id_grupo}>
                      {g.nombre_grupo} ({g.grado}° - Ciclo {g.ciclo_escolar})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Estado del Alumno
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </form>
        ) : (
          <CsvImportSection
            title="Importar Alumnos"
            templateFilename="plantilla_alumnos_sicara.csv"
            templateHeaders={['nombre', 'apellidos', 'curp', 'fecha_nacimiento', 'grupo', 'estado']}
            sampleRows={[
              ['Sofía', 'Hernández Cruz', 'HECS130418MOCRRFO8', '2013-04-18', '1° A', 'Activo'],
              ['Mateo', 'López Díaz', 'LODM140822MOCRRFA1', '2014-08-22', '1° A', 'Activo'],
              ['Camila', 'Vázquez Pérez', 'VAPC121105MOCRRFN3', '2012-11-05', '2° A', 'Activo'],
            ]}
            columnGuide={[
              { name: 'nombre', required: true },
              { name: 'apellidos', required: false },
              { name: 'curp', required: false },
              { name: 'fecha_nacimiento', required: false },
              { name: 'grupo (nombre o ID)', required: false },
              { name: 'estado', required: false },
            ]}
            onImportBatch={api.importarAlumnosBatch}
            onSuccess={() => fetchData()}
            primaryColor={primaryColor}
          />
        )}
      </Modal>

      {/* MODAL: Historial Académico y Alertas del Alumno */}
      <Modal
        isOpen={showHistorialModal}
        onClose={() => {
          setShowHistorialModal(false);
          setHistorialAlumno(null);
        }}
        title={`Historial Escolar: ${historialAlumno?.alumno?.nombre || ''} ${historialAlumno?.alumno?.apellidos || ''}`}
        subtitle={`CURP: ${historialAlumno?.alumno?.curp || 'S/C'}`}
        maxWidth="max-w-2xl"
        footer={
          <button
            onClick={() => setShowHistorialModal(false)}
            className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        }
      >
        {loadingHistorial ? (
          <div className="py-8 text-center text-app-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
            Cargando historial del alumno...
          </div>
        ) : (
          <div className="space-y-5 text-xs">
            {/* Calificaciones */}
            <div>
              <h4 className="font-bold text-app-text flex items-center gap-1.5 mb-2">
                <Award className="w-4 h-4 text-vino-primary" />
                Calificaciones Registradas
              </h4>
              {(historialAlumno?.calificaciones || []).length === 0 ? (
                <p className="text-app-muted italic p-3 bg-gray-50 rounded-subtle">
                  No hay calificaciones asentadas para este alumno.
                </p>
              ) : (
                <div className="border border-app-border rounded-subtle overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-app-muted font-bold text-[11px]">
                      <tr>
                        <th className="p-2">Materia</th>
                        <th className="p-2">Periodo</th>
                        <th className="p-2">Docente</th>
                        <th className="p-2 text-right">Calificación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {historialAlumno.calificaciones.map((c) => (
                        <tr key={c.id_calificacion}>
                          <td className="p-2 font-bold">{c.nombre_materia}</td>
                          <td className="p-2 text-app-muted">{c.periodo}</td>
                          <td className="p-2 text-app-muted">{c.docente_nombre || 'Docente'}</td>
                          <td className="p-2 text-right font-mono font-bold text-sm">
                            {c.calificacion}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Asistencias Recientes */}
            <div>
              <h4 className="font-bold text-app-text flex items-center gap-1.5 mb-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Asistencia Reciente
              </h4>
              {(historialAlumno?.asistencias || []).length === 0 ? (
                <p className="text-app-muted italic p-3 bg-gray-50 rounded-subtle">
                  Sin registros de asistencia acumulados.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                  {historialAlumno.asistencias.map((asi) => (
                    <div
                      key={asi.id_asistencia}
                      className="p-2 rounded-subtle border border-app-border bg-gray-50 flex justify-between items-center text-[11px]"
                    >
                      <span className="text-app-muted">
                        {new Date(asi.fecha).toLocaleDateString('es-MX')}
                      </span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          asi.estado_asistencia?.toLowerCase() === 'presente'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {asi.estado_asistencia}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alertas */}
            <div>
              <h4 className="font-bold text-app-text flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alertas Asociadas
              </h4>
              {(historialAlumno?.alertas || []).length === 0 ? (
                <p className="text-emerald-700 bg-emerald-50 p-2.5 rounded-subtle border border-emerald-200">
                  ✔ Alumno sin alertas registradas.
                </p>
              ) : (
                <div className="space-y-2">
                  {historialAlumno.alertas.map((al) => (
                    <div
                      key={al.id_alerta}
                      className="p-2.5 rounded-subtle border border-amber-200 bg-amber-50/50"
                    >
                      <div className="flex justify-between items-center font-bold text-amber-900">
                        <span>{al.tipo_alerta}</span>
                        <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded text-amber-800">
                          {al.estado_alerta}
                        </span>
                      </div>
                      <p className="text-[11px] text-app-muted mt-1">{al.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Eliminación Lógica con Advertencia de Dependencias */}
      <EliminarModalDirectivo
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAlumnoToDelete(null);
        }}
        onConfirm={handleConfirmDeleteAlumno}
        tipo="alumno"
        id={alumnoToDelete?.id_alumno}
        nombre={alumnoToDelete ? `${alumnoToDelete.nombre} ${alumnoToDelete.apellidos || ''}` : ''}
        isLoading={deleteLoading}
      />
    </div>
  );
}

