import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import CsvImportSection from '../../components/directivo/CsvImportSection';
import {
  Layers,
  PlusCircle,
  Search,
  RefreshCw,
  Edit2,
  Users,
  BookOpen,
  UserPlus,
  Trash2,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

export default function DirectivoGruposView({ escuela }) {
  const { showToast } = useToast();
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGrado, setFilterGrado] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('manual'); // 'manual' | 'csv'
  const [editingGrupo, setEditingGrupo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario de Grupo
  const [formData, setFormData] = useState({
    nombre_grupo: '',
    grado: '1',
    ciclo_escolar: '2024-2025',
    estado: 'Activo',
  });

  // Modal Detalle de Grupo (alumnos y materias)
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleGrupo, setDetalleGrupo] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Inscribir alumno
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
  const [selectedAlumnoToEnroll, setSelectedAlumnoToEnroll] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchGrupos = async (searchTerm = search, gradoTerm = filterGrado) => {
    setLoading(true);
    try {
      const res = await api.getDirectivoGrupos({
        q: searchTerm,
        grado: gradoTerm,
      });
      if (res.success) {
        setGrupos(res.grupos || []);
      }
    } catch (err) {
      console.error('Error al listar grupos:', err);
      showToast('Error al cargar grupos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGrupos(search, filterGrado);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, filterGrado]);

  const handleOpenCreate = () => {
    setEditingGrupo(null);
    setModalTab('manual');
    setFormData({
      nombre_grupo: '',
      grado: '1',
      ciclo_escolar: '2024-2025',
      estado: 'Activo',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (grp) => {
    setEditingGrupo(grp);
    setModalTab('manual');
    setFormData({
      nombre_grupo: grp.nombre_grupo || '',
      grado: grp.grado || '1',
      ciclo_escolar: grp.ciclo_escolar || '2024-2025',
      estado: grp.estado || 'Activo',
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.nombre_grupo.trim()) {
      showToast('El nombre del grupo es obligatorio.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      if (editingGrupo) {
        const res = await api.updateDirectivoGrupo(editingGrupo.id_grupo, formData);
        if (res.success) {
          showToast('Grupo actualizado correctamente.', 'success');
          setShowModal(false);
          fetchGrupos();
        }
      } else {
        const res = await api.createDirectivoGrupo(formData);
        if (res.success) {
          showToast('Grupo creado exitosamente.', 'success');
          setShowModal(false);
          fetchGrupos();
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar grupo.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetalle = async (grp) => {
    setLoadingDetalle(true);
    setShowDetalleModal(true);
    try {
      const [detRes, alRes] = await Promise.all([
        api.getDirectivoGrupoDetalle(grp.id_grupo),
        api.getDirectivoAlumnos({ estado: 'Activo' }),
      ]);

      if (detRes.success) setDetalleGrupo(detRes);
      if (alRes.success) setAlumnosDisponibles(alRes.alumnos || []);
    } catch (err) {
      showToast('Error al consultar detalle del grupo.', 'error');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleEnrollAlumno = async (e) => {
    e.preventDefault();
    if (!selectedAlumnoToEnroll || !detalleGrupo?.grupo?.id_grupo) {
      showToast('Seleccione un alumno para inscribir.', 'warning');
      return;
    }

    setEnrolling(true);
    try {
      const res = await api.inscribirAlumnoGrupo(detalleGrupo.grupo.id_grupo, selectedAlumnoToEnroll);
      if (res.success) {
        showToast('Alumno inscrito con éxito.', 'success');
        setSelectedAlumnoToEnroll('');
        // Refrescar detalle
        const detRes = await api.getDirectivoGrupoDetalle(detalleGrupo.grupo.id_grupo);
        if (detRes.success) setDetalleGrupo(detRes);
        fetchGrupos();
      }
    } catch (err) {
      showToast(err.message || 'Error al inscribir alumno.', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveAlumno = async (idAlumno) => {
    if (!confirm('¿Desea desvincular al alumno de este grupo?')) return;
    try {
      const res = await api.desvincularAlumnoGrupo(detalleGrupo.grupo.id_grupo, idAlumno);
      if (res.success) {
        showToast('Alumno desvinculado.', 'info');
        const detRes = await api.getDirectivoGrupoDetalle(detalleGrupo.grupo.id_grupo);
        if (detRes.success) setDetalleGrupo(detRes);
        fetchGrupos();
      }
    } catch (err) {
      showToast(err.message || 'Error al desvincular alumno.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <Layers className="w-5 h-5 text-vino-primary" />
            Gestión de Grupos Escolares
          </h2>
          <p className="text-xs text-app-muted">
            Organización de grados, secciones, matrícula inscrita y asignación curricular
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{ backgroundColor: primaryColor }}
          className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Crear Grupo</span>
        </button>
      </div>

      {/* Buscador y filtro de grado */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchGrupos();
          }}
          className="relative flex-1 min-w-[220px]"
        >
          <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de grupo..."
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

        <button
          onClick={fetchGrupos}
          disabled={loading}
          className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
          title="Recargar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-app-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
            Cargando grupos del plantel...
          </div>
        ) : grupos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-app-muted bg-white rounded-card border border-app-border">
            No hay grupos registrados en este plantel escolar.
          </div>
        ) : (
          grupos.map((grp) => (
            <div
              key={grp.id_grupo}
              className="bg-white rounded-card p-5 border border-app-border shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base border border-app-border"
                    >
                      {grp.grado}°
                    </div>
                    <div>
                      <h3 className="font-bold text-app-text text-sm leading-tight">
                        {grp.nombre_grupo}
                      </h3>
                      <p className="text-[11px] text-app-muted">Ciclo: {grp.ciclo_escolar}</p>
                    </div>
                  </div>
                  <Badge status={grp.estado || 'Activo'} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-app-border/60 text-xs">
                  <div className="p-2 bg-gray-50 rounded-subtle">
                    <span className="text-[10px] text-app-muted block uppercase font-bold">
                      Alumnos
                    </span>
                    <span className="font-bold text-sm text-app-text flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      {grp.total_alumnos} inscritos
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-subtle">
                    <span className="text-[10px] text-app-muted block uppercase font-bold">
                      Materias
                    </span>
                    <span className="font-bold text-sm text-app-text flex items-center gap-1 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      {grp.total_materias} asignadas
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-app-border/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenDetalle(grp)}
                  className="flex-1 py-1.5 px-3 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-bold text-xs text-center cursor-pointer transition-colors"
                >
                  Ver Alumnos & Carga
                </button>
                <button
                  onClick={() => handleOpenEdit(grp)}
                  className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary cursor-pointer transition-colors"
                  title="Editar grupo"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Crear / Editar Grupo */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingGrupo ? 'Editar Grupo Escolar' : 'Crear / Importar Grupos'}
        subtitle={
          editingGrupo
            ? 'Modifique la denominación o ciclo académico del grupo'
            : 'Registre un grupo manualmente o importe múltiples grupos desde un archivo CSV (Excel)'
        }
        maxWidth={modalTab === 'csv' ? 'max-w-2xl' : 'max-w-md'}
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
                form="form-grupo"
                disabled={actionLoading}
                style={{ backgroundColor: primaryColor }}
                className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Grupo'}
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
        {!editingGrupo && (
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
              <PlusCircle className="w-3.5 h-3.5" />
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
          <form id="form-grupo" onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Nombre / Denominación del Grupo <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nombre_grupo}
                onChange={(e) => setFormData({ ...formData, nombre_grupo: e.target.value })}
                placeholder="Ej. 1° A, Multigrado Matutino"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Grado Escolar
                </label>
                <select
                  value={formData.grado}
                  onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
                >
                  <option value="1">1° de Primaria</option>
                  <option value="2">2° de Primaria</option>
                  <option value="3">3° de Primaria</option>
                  <option value="4">4° de Primaria</option>
                  <option value="5">5° de Primaria</option>
                  <option value="6">6° de Primaria</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Ciclo Escolar
                </label>
                <input
                  type="text"
                  required
                  value={formData.ciclo_escolar}
                  onChange={(e) => setFormData({ ...formData, ciclo_escolar: e.target.value })}
                  placeholder="2024-2025"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Estado
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
          </form>
        ) : (
          <CsvImportSection
            title="Importar Grupos Escolares"
            templateFilename="plantilla_grupos_sicara.csv"
            templateHeaders={['nombre_grupo', 'grado', 'ciclo_escolar', 'estado']}
            sampleRows={[
              ['1° A', '1', '2024-2025', 'Activo'],
              ['2° A', '2', '2024-2025', 'Activo'],
              ['Multigrado Matutino', '1', '2024-2025', 'Activo'],
            ]}
            columnGuide={[
              { name: 'nombre_grupo', required: true },
              { name: 'grado', required: false },
              { name: 'ciclo_escolar', required: false },
              { name: 'estado', required: false },
            ]}
            onImportBatch={api.importarGruposBatch}
            onSuccess={() => fetchGrupos()}
            primaryColor={primaryColor}
          />
        )}
      </Modal>

      {/* MODAL: Detalle de Grupo (Inscribir Alumnos y Carga de Docentes) */}
      <Modal
        isOpen={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false);
          setDetalleGrupo(null);
        }}
        title={`Grupo: ${detalleGrupo?.grupo?.nombre_grupo || ''} (${detalleGrupo?.grupo?.grado || ''}°)`}
        subtitle={`Ciclo Escolar: ${detalleGrupo?.grupo?.ciclo_escolar || ''} • Matrícula: ${detalleGrupo?.alumnos?.length || 0} alumnos`}
        maxWidth="max-w-2xl"
        footer={
          <button
            onClick={() => setShowDetalleModal(false)}
            className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        }
      >
        {loadingDetalle ? (
          <div className="py-8 text-center text-app-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
            Cargando información del grupo...
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Formulario rápido para inscribir alumno */}
            <div className="p-3.5 bg-gray-50 rounded-card border border-app-border">
              <h4 className="font-bold text-app-text mb-2 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-vino-primary" />
                Inscribir Alumno en este Grupo
              </h4>
              <form onSubmit={handleEnrollAlumno} className="flex gap-2">
                <select
                  value={selectedAlumnoToEnroll}
                  onChange={(e) => setSelectedAlumnoToEnroll(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-subtle border border-app-border bg-white text-xs"
                >
                  <option value="">Seleccione un alumno de la escuela...</option>
                  {alumnosDisponibles.map((a) => (
                    <option key={a.id_alumno} value={a.id_alumno}>
                      {a.nombre} {a.apellidos} ({a.curp || 'S/CURP'})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={enrolling || !selectedAlumnoToEnroll}
                  style={{ backgroundColor: primaryColor }}
                  className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {enrolling ? 'Inscribiendo...' : 'Inscribir'}
                </button>
              </form>
            </div>

            {/* Lista de alumnos inscritos */}
            <div>
              <h4 className="font-bold text-app-text mb-2">
                Alumnos Inscritos ({detalleGrupo?.alumnos?.length || 0})
              </h4>
              {(detalleGrupo?.alumnos || []).length === 0 ? (
                <p className="text-app-muted italic p-3 bg-gray-50 rounded-subtle">
                  Aún no hay alumnos inscritos en este grupo. Utilice el selector superior para agregar alumnos.
                </p>
              ) : (
                <div className="border border-app-border rounded-subtle overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-app-muted font-bold text-[11px]">
                      <tr>
                        <th className="p-2">Alumno</th>
                        <th className="p-2">CURP</th>
                        <th className="p-2">Fecha Inscripción</th>
                        <th className="p-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {detalleGrupo.alumnos.map((al) => (
                        <tr key={al.id_alumno}>
                          <td className="p-2 font-bold text-app-text">
                            {al.nombre} {al.apellidos}
                          </td>
                          <td className="p-2 font-mono text-[11px] text-app-muted">
                            {al.curp || 'S/C'}
                          </td>
                          <td className="p-2 text-app-muted">
                            {al.fecha_inscripcion
                              ? new Date(al.fecha_inscripcion).toLocaleDateString('es-MX')
                              : 'Actual'}
                          </td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => handleRemoveAlumno(al.id_alumno)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                              title="Desvincular del grupo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Asignaciones de materias y docentes */}
            <div>
              <h4 className="font-bold text-app-text mb-2">
                Materias y Docentes Asignados a este Grupo ({detalleGrupo?.asignaciones?.length || 0})
              </h4>
              {(detalleGrupo?.asignaciones || []).length === 0 ? (
                <p className="text-app-muted italic p-3 bg-gray-50 rounded-subtle">
                  No se han asignado materias a este grupo escolar aún. Puede gestionarlas desde el módulo de Materias.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detalleGrupo.asignaciones.map((asig) => (
                    <div
                      key={asig.id_grupo_docente}
                      className="p-2.5 rounded-subtle border border-app-border bg-white flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-app-text">{asig.nombre_materia}</p>
                        <p className="text-[11px] text-app-muted">
                          Profr(a): {asig.docente_nombre || 'Sin asignar'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Impartida
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

