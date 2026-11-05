import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  BookOpen,
  PlusCircle,
  Search,
  RefreshCw,
  Edit2,
  Share2,
  Trash2,
  GraduationCap,
  Layers,
} from 'lucide-react';

export default function DirectivoMateriasView({ escuela }) {
  const { showToast } = useToast();
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [editingMateria, setEditingMateria] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario Materia
  const [formData, setFormData] = useState({
    nombre_materia: '',
    descripcion: '',
    estado: 'Activo',
  });

  // Modal Asignar a Grupo y Docente
  const [showAsigModal, setShowAsigModal] = useState(false);
  const [asigData, setAsigData] = useState({
    id_materia: '',
    id_grupo: '',
    id_docente: '',
  });

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, docRes, grpRes] = await Promise.all([
        api.getDirectivoMaterias({ q: search, estado: filterEstado }),
        api.getDirectivoDocentes({ estado: 'Activo' }),
        api.getDirectivoGrupos({ estado: 'Activo' }),
      ]);

      if (matRes.success) setMaterias(matRes.materias || []);
      if (docRes.success) setDocentes(docRes.docentes || []);
      if (grpRes.success) setGrupos(grpRes.grupos || []);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
      showToast('Error al cargar materias y recursos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterEstado]);

  const handleOpenCreate = () => {
    setEditingMateria(null);
    setFormData({
      nombre_materia: '',
      descripcion: '',
      estado: 'Activo',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMateria(m);
    setFormData({
      nombre_materia: m.nombre_materia || '',
      descripcion: m.descripcion || '',
      estado: m.estado || 'Activo',
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.nombre_materia.trim()) {
      showToast('El nombre de la materia es obligatorio.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      if (editingMateria) {
        const res = await api.updateDirectivoMateria(editingMateria.id_materia, formData);
        if (res.success) {
          showToast('Materia actualizada con éxito.', 'success');
          setShowModal(false);
          fetchData();
        }
      } else {
        const res = await api.createDirectivoMateria(formData);
        if (res.success) {
          showToast('Materia agregada al catálogo.', 'success');
          setShowModal(false);
          fetchData();
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar materia.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAsignar = (materia = null) => {
    setAsigData({
      id_materia: materia ? materia.id_materia : '',
      id_grupo: '',
      id_docente: '',
    });
    setShowAsigModal(true);
  };

  const handleSaveAsignacion = async (e) => {
    e.preventDefault();
    if (!asigData.id_materia || !asigData.id_grupo || !asigData.id_docente) {
      showToast('Debe seleccionar la materia, el grupo y el docente.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createDirectivoAsignacion(asigData);
      if (res.success) {
        showToast('Asignación académica guardada correctamente.', 'success');
        setShowAsigModal(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Error al procesar asignación.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-vino-primary" />
            Catálogo de Materias y Asignaciones
          </h2>
          <p className="text-xs text-app-muted">
            Plan de estudios, asignaturas curriculares y asignación de docentes a grupos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAsignar(null)}
            className="px-3.5 py-2 rounded-subtle bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Asignar a Grupo</span>
          </button>
          <button
            onClick={handleOpenCreate}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Materia</span>
          </button>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData();
          }}
          className="relative flex-1 min-w-[220px]"
        >
          <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar materia por nombre..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
          />
        </form>

        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
        >
          <option value="todos">Todos los estados</option>
          <option value="Activo">Activas</option>
          <option value="Inactivo">Inactivas</option>
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

      {/* Tabla de Materias */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Materia</th>
                <th className="py-3 px-4">Descripción Curricular</th>
                <th className="py-3 px-4">Grupos Asignados</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-app-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                    Cargando plan curricular...
                  </td>
                </tr>
              ) : materias.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-app-muted">
                    No hay materias registradas en el catálogo.
                  </td>
                </tr>
              ) : (
                materias.map((m) => (
                  <tr key={m.id_materia} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-app-text text-sm">{m.nombre_materia}</div>
                      <div className="text-[10px] text-app-muted">
                        {m.id_escuela ? 'Materia institucional propia' : 'Materia curricular común'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-app-muted max-w-xs truncate">
                      {m.descripcion || <span className="italic">Sin descripción</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <Layers className="w-3 h-3 text-blue-600" />
                        {m.total_grupos_asignados} grupo(s)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={m.estado || 'Activo'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenAsignar(m)}
                          className="px-2 py-1 rounded-subtle bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold cursor-pointer transition-colors"
                          title="Asignar docente y grupo"
                        >
                          Asignar
                        </button>
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
                          title="Editar materia"
                        >
                          <Edit2 className="w-4 h-4" />
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

      {/* MODAL: Registrar / Editar Materia */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMateria ? 'Editar Materia' : 'Registrar Nueva Materia'}
        subtitle="Agregue materias al catálogo institucional del plantel"
        maxWidth="max-w-md"
        footer={
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
              form="form-materia"
              disabled={actionLoading}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Guardando...' : 'Guardar Materia'}
            </button>
          </>
        }
      >
        <form id="form-materia" onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Nombre de la Materia <span className="text-status-error">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nombre_materia}
              onChange={(e) => setFormData({ ...formData, nombre_materia: e.target.value })}
              placeholder="Ej. Lengua Indígena y Español, Ciencias"
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Descripción o Enfoque Curricular
            </label>
            <textarea
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Breve descripción del programa..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
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
      </Modal>

      {/* MODAL: Asignar Materia y Docente a Grupo */}
      <Modal
        isOpen={showAsigModal}
        onClose={() => setShowAsigModal(false)}
        title="Asignación Curricular a Grupo"
        subtitle="Vincule una materia con el docente que la impartirá en un grupo escolar"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAsigModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-asignacion"
              disabled={actionLoading}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Asignando...' : 'Guardar Asignación'}
            </button>
          </>
        }
      >
        <form id="form-asignacion" onSubmit={handleSaveAsignacion} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Materia <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={asigData.id_materia}
              onChange={(e) => setAsigData({ ...asigData, id_materia: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Seleccione una materia...</option>
              {materias.map((m) => (
                <option key={m.id_materia} value={m.id_materia}>
                  {m.nombre_materia}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Grupo Escolar <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={asigData.id_grupo}
              onChange={(e) => setAsigData({ ...asigData, id_grupo: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Seleccione el grupo receptor...</option>
              {grupos.map((g) => (
                <option key={g.id_grupo} value={g.id_grupo}>
                  {g.nombre_grupo} ({g.grado}° - Ciclo {g.ciclo_escolar})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Docente Responsable <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={asigData.id_docente}
              onChange={(e) => setAsigData({ ...asigData, id_docente: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Seleccione al docente...</option>
              {docentes.map((d) => (
                <option key={d.id_docente} value={d.id_docente}>
                  {d.nombre} {d.apellidos} ({d.especialidad || 'Docente'})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

