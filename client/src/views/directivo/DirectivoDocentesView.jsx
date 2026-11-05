import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  GraduationCap,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  BookOpen,
  Mail,
  Phone,
  Lock,
  Layers,
} from 'lucide-react';

export default function DirectivoDocentesView({ escuela }) {
  const { showToast } = useToast();
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState(false);
  const [editingDocente, setEditingDocente] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal Asignaciones
  const [showAsigModal, setShowAsigModal] = useState(false);
  const [selectedDocente, setSelectedDocente] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loadingAsig, setLoadingAsig] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    contrasena: '',
    curp: '',
    especialidad: '',
    telefono: '',
    estado: 'Activo',
  });

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchDocentes = async () => {
    setLoading(true);
    try {
      const res = await api.getDirectivoDocentes({
        q: search,
        estado: filterEstado,
      });
      if (res.success) {
        setDocentes(res.docentes || []);
      }
    } catch (err) {
      console.error('Error al cargar docentes:', err);
      showToast('Error al cargar lista de docentes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocentes();
  }, [filterEstado]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocentes();
  };

  const handleOpenCreate = () => {
    setEditingDocente(null);
    setFormData({
      nombre: '',
      apellidos: '',
      correo: '',
      contrasena: '',
      curp: '',
      especialidad: '',
      telefono: '',
      estado: 'Activo',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDocente(doc);
    setFormData({
      nombre: doc.nombre || '',
      apellidos: doc.apellidos || '',
      correo: doc.correo || '',
      contrasena: '',
      curp: doc.curp || '',
      especialidad: doc.especialidad || '',
      telefono: doc.telefono || '',
      estado: doc.estado || 'Activo',
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      showToast('El nombre es obligatorio.', 'warning');
      return;
    }
    if (!editingDocente && !formData.correo.trim()) {
      showToast('El correo electrónico es obligatorio.', 'warning');
      return;
    }
    if (!editingDocente && (!formData.contrasena || formData.contrasena.length < 6)) {
      showToast('La contraseña inicial debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      if (editingDocente) {
        const res = await api.updateDirectivoDocente(editingDocente.id_docente, formData);
        if (res.success) {
          showToast('Docente actualizado exitosamente.', 'success');
          setShowModal(false);
          fetchDocentes();
        }
      } else {
        const res = await api.createDirectivoDocente(formData);
        if (res.success) {
          showToast('Docente registrado exitosamente.', 'success');
          setShowModal(false);
          fetchDocentes();
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar docente.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAsignaciones = async (doc) => {
    setSelectedDocente(doc);
    setShowAsigModal(true);
    setLoadingAsig(true);
    try {
      const res = await api.getDirectivoDocenteAsignaciones(doc.id_docente);
      if (res.success) {
        setAsignaciones(res.asignaciones || []);
      }
    } catch (err) {
      showToast('Error al consultar asignaciones del docente.', 'error');
    } finally {
      setLoadingAsig(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-vino-primary" />
            Administración de Docentes
          </h2>
          <p className="text-xs text-app-muted">
            Gestión del personal docente, credenciales institucionales y carga académica
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{ backgroundColor: primaryColor }}
          className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Docente</span>
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, CURP o correo..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
          />
        </form>

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
          onClick={fetchDocentes}
          disabled={loading}
          className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
          title="Recargar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabla de Docentes */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Docente</th>
                <th className="py-3 px-4">CURP / Especialidad</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Carga Académica</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-app-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                    Cargando nómina docente...
                  </td>
                </tr>
              ) : docentes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-app-muted">
                    No hay docentes registrados en la institución.
                  </td>
                </tr>
              ) : (
                docentes.map((doc) => (
                  <tr key={doc.id_docente} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-app-text">
                        {doc.nombre} {doc.apellidos}
                      </div>
                      <div className="text-[11px] font-mono text-app-muted">{doc.correo}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-app-text">
                        {doc.curp || <span className="text-app-muted italic">S/C</span>}
                      </div>
                      <div className="text-[10px] text-app-muted">
                        {doc.especialidad || 'Educación Básica'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-app-muted">
                      {doc.telefono ? (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3" />
                          {doc.telefono}
                        </span>
                      ) : (
                        'Sin teléfono'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewAsignaciones(doc)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-semibold cursor-pointer transition-colors"
                      >
                        <Layers className="w-3 h-3" />
                        <span>{doc.total_grupos} grupos • {doc.total_materias} materias</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={doc.estado || 'Activo'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(doc)}
                        className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
                        title="Editar docente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Registrar / Editar Docente */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDocente ? 'Modificar Datos de Docente' : 'Registrar Nuevo Docente'}
        subtitle="Se creará o actualizará la cuenta de usuario con rol DOCENTE en SICARA"
        maxWidth="max-w-xl"
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
              form="form-docente"
              disabled={actionLoading}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Guardando...' : 'Guardar Docente'}
            </button>
          </>
        }
      >
        <form id="form-docente" onSubmit={handleSubmitForm} className="space-y-4 text-xs">
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
                placeholder="Ej. María de Jesús"
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
                placeholder="Ej. López Hernández"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Correo Electrónico <span className="text-status-error">*</span>
              </label>
              <input
                type="email"
                required
                disabled={!!editingDocente}
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                placeholder="docente@escuela.edu.mx"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                {editingDocente ? 'Cambiar Contraseña (opcional)' : 'Contraseña Inicial *'}
              </label>
              <input
                type="password"
                required={!editingDocente}
                value={formData.contrasena}
                onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                placeholder={editingDocente ? 'Dejar en blanco para conservar' : 'Mínimo 6 caracteres'}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                CURP
              </label>
              <input
                type="text"
                maxLength={18}
                value={formData.curp}
                onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                placeholder="18 caracteres"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Especialidad
              </label>
              <input
                type="text"
                value={formData.especialidad}
                onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                placeholder="Ej. Matemáticas, Primaria"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej. 9611234567"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Estado de la Cuenta
            </label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="Activo">Activo (Puede acceder a SICARA)</option>
              <option value="Inactivo">Inactivo (Acceso suspendido)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* MODAL: Ver Carga Académica de Asignaciones */}
      <Modal
        isOpen={showAsigModal}
        onClose={() => {
          setShowAsigModal(false);
          setSelectedDocente(null);
        }}
        title={`Carga Académica: Profr(a). ${selectedDocente?.nombre || ''} ${selectedDocente?.apellidos || ''}`}
        subtitle="Grupos y materias asignadas a este docente en el plantel"
        maxWidth="max-w-xl"
        footer={
          <button
            onClick={() => setShowAsigModal(false)}
            className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        }
      >
        {loadingAsig ? (
          <div className="py-8 text-center text-app-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
            Consultando asignaciones...
          </div>
        ) : asignaciones.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-card border border-app-border text-center text-app-muted text-xs">
            Este docente aún no tiene grupos ni materias asignadas. Puede asignarle materias en el módulo de <b>Materias</b> o <b>Grupos</b>.
          </div>
        ) : (
          <div className="space-y-2">
            {asignaciones.map((asig) => (
              <div
                key={asig.id_grupo_docente}
                className="p-3 rounded-card border border-app-border bg-white flex justify-between items-center text-xs"
              >
                <div>
                  <p className="font-bold text-app-text text-sm">{asig.nombre_materia}</p>
                  <p className="text-[11px] text-app-muted">
                    Grupo: {asig.nombre_grupo} • Grado: {asig.grado}° • Ciclo: {asig.ciclo_escolar}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Asignado
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

