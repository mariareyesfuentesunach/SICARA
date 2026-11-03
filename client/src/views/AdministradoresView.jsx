import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Search,
  RefreshCw,
  Power,
  Edit2,
  Lock,
  Mail,
  User,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

export default function AdministradoresView() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [administradores, setAdministradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isPrincipal, setIsPrincipal] = useState(false);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState(null);

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [adminToToggle, setAdminToToggle] = useState(null);

  // Formulario de creación
  const [createData, setCreateData] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    contrasena: '',
    confirmar_contrasena: '',
  });
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Formulario de edición
  const [editData, setEditData] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
  });
  const [editErrors, setEditErrors] = useState({});

  const fetchAdministradores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdministradores();
      if (res.success) {
        setAdministradores(res.administradores || []);
        setIsPrincipal(Boolean(res.currentUserIsPrincipal));
      }
    } catch (err) {
      console.error('Error al consultar administradores:', err);
      showToast('Error al cargar la lista de administradores.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdministradores();
  }, [fetchAdministradores]);

  // Validaciones del formulario de creación
  const validateCreateForm = () => {
    const errors = {};
    if (!createData.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio.';
    } else if (createData.nombre.trim().length > 100) {
      errors.nombre = 'Máximo 100 caracteres.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!createData.correo.trim()) {
      errors.correo = 'El correo electrónico es obligatorio.';
    } else if (!emailRegex.test(createData.correo.trim().toLowerCase())) {
      errors.correo = 'Formato de correo electrónico inválido.';
    }

    if (!createData.contrasena) {
      errors.contrasena = 'La contraseña inicial es obligatoria.';
    } else if (createData.contrasena.length < 6) {
      errors.contrasena = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (createData.contrasena !== createData.confirmar_contrasena) {
      errors.confirmar_contrasena = 'Las contraseñas no coinciden.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enviar formulario de creación
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm() || actionLoading) return;

    setActionLoading(true);
    try {
      const res = await api.createAdministrador(createData);
      if (res.success) {
        showToast(res.message, 'success');
        setShowCreateModal(false);
        setCreateData({
          nombre: '',
          apellidos: '',
          correo: '',
          contrasena: '',
          confirmar_contrasena: '',
        });
        setFormErrors({});
        fetchAdministradores();
      }
    } catch (err) {
      console.error('Error al registrar administrador:', err);
      showToast(err.message || 'Error al crear la cuenta de administrador.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir modal de edición
  const handleOpenEdit = (admin) => {
    if (!isPrincipal) {
      showToast('Solo el Administrador Principal puede modificar cuentas.', 'warning');
      return;
    }
    setAdminToEdit(admin);
    setEditData({
      nombre: admin.nombre || '',
      apellidos: admin.apellidos || '',
      correo: admin.correo || '',
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  // Guardar edición
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!editData.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editData.correo.trim() || !emailRegex.test(editData.correo.trim().toLowerCase())) {
      errors.correo = 'Ingrese un correo electrónico válido.';
    }
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.updateAdministrador(adminToEdit.id_usuario, editData);
      if (res.success) {
        showToast(res.message, 'success');
        setShowEditModal(false);
        setAdminToEdit(null);
        fetchAdministradores();
      }
    } catch (err) {
      showToast(err.message || 'Error al actualizar datos.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir modal para activar/desactivar
  const handleOpenToggle = (admin) => {
    if (admin.es_principal) {
      showToast('No es posible modificar el estado del Administrador Principal.', 'warning');
      return;
    }
    if (!isPrincipal) {
      showToast('Solo el Administrador Principal puede cambiar el estado de cuentas.', 'warning');
      return;
    }
    setAdminToToggle(admin);
    setShowToggleModal(true);
  };

  // Confirmar cambio de estado
  const handleConfirmToggle = async () => {
    if (!adminToToggle || actionLoading) return;
    const nuevoEstado = adminToToggle.estado === 'Activo' ? 'Inactivo' : 'Activo';

    setActionLoading(true);
    try {
      const res = await api.updateEstadoAdministrador(adminToToggle.id_usuario, nuevoEstado);
      if (res.success) {
        showToast(res.message, nuevoEstado === 'Activo' ? 'success' : 'warning');
        setShowToggleModal(false);
        setAdminToToggle(null);
        fetchAdministradores();
      }
    } catch (err) {
      showToast(err.message || 'Error al cambiar estado.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrar administradores por búsqueda
  const filteredAdmins = administradores.filter((adm) => {
    const q = search.toLowerCase();
    return (
      (adm.nombre && adm.nombre.toLowerCase().includes(q)) ||
      (adm.apellidos && adm.apellidos.toLowerCase().includes(q)) ||
      (adm.correo && adm.correo.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Acciones */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Título y badge */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-vino-soft text-vino-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
                Gestión de Administradores Generales
                {isPrincipal && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-vino-primary text-white">
                    Cuenta Principal
                  </span>
                )}
              </h2>
              <p className="text-xs text-app-muted">
                Control de acceso, altas administrativas y salvaguardas de seguridad
              </p>
            </div>
          </div>
        </div>

        {/* Buscador y Botón Crear */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary transition-all"
            />
          </div>

          <button
            onClick={fetchAdministradores}
            disabled={loading}
            className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary hover:border-vino-primary transition-colors cursor-pointer"
            title="Recargar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isPrincipal ? (
            <button
              onClick={() => {
                setCreateData({
                  nombre: '',
                  apellidos: '',
                  correo: '',
                  contrasena: '',
                  confirmar_contrasena: '',
                });
                setFormErrors({});
                setShowCreateModal(true);
              }}
              className="px-4 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Administrador</span>
            </button>
          ) : (
            <div className="text-[11px] font-semibold text-app-muted px-3 py-1.5 rounded-subtle bg-gray-100 border border-gray-200">
              Modo consulta (Administrador adicional)
            </div>
          )}
        </div>
      </div>

      {/* Banner Informativo de Roles */}
      <div className="p-4 rounded-card bg-vino-soft/50 border border-vino-border/40 text-xs text-vino-dark flex items-start gap-3">
        <UserCheck className="w-5 h-5 text-vino-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Esquema de Autorización y Gobernanza:</p>
          <p className="text-app-text/90">
            • <strong>Administrador Principal:</strong> Posee la cuenta raíz con permisos exclusivos para dar de alta y gestionar administradores adicionales. Su cuenta está protegida contra desactivación o eliminación.
          </p>
          <p className="text-app-text/90">
            • <strong>Administradores Generales Adicionales:</strong> Cuentan con credenciales autorizadas e independientes para gestionar solicitudes de escuelas, aprobar o rechazar planteles y consultar el catálogo oficial.
          </p>
        </div>
      </div>

      {/* Tabla de Administradores */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/70 text-app-muted uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Administrador</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Nivel / Jerarquía</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha de Alta</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border text-app-text">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-app-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-vino-primary border-t-transparent rounded-full animate-spin" />
                      <span>Cargando cuentas administrativas...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-app-muted">
                    No se encontraron cuentas de administrador registradas.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((adm) => {
                  const isCurrent = currentUser?.id_usuario === adm.id_usuario;
                  return (
                    <tr
                      key={adm.id_usuario}
                      className={`hover:bg-gray-50/60 transition-colors ${
                        adm.es_principal ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Nombre */}
                      <td className="py-3.5 px-4 font-semibold text-app-text">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              adm.es_principal
                                ? 'bg-vino-primary text-white shadow-xs'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {adm.nombre ? adm.nombre[0].toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>
                                {adm.nombre} {adm.apellidos || ''}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-200 text-gray-700">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-app-muted font-normal">
                              {adm.rol}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Correo */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-app-text">
                        {adm.correo}
                      </td>

                      {/* Jerarquía */}
                      <td className="py-3.5 px-4">
                        {adm.es_principal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            Principal (Protegido)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            Administrador Adicional
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <Badge status={adm.estado || 'Activo'} />
                      </td>

                      {/* Fecha de registro */}
                      <td className="py-3.5 px-4 text-app-muted">
                        {adm.fecha_registro
                          ? new Date(adm.fecha_registro).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Inicial'}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isPrincipal && (
                            <button
                              onClick={() => handleOpenEdit(adm)}
                              className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
                              title="Editar datos"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {isPrincipal && !adm.es_principal && (
                            <button
                              onClick={() => handleOpenToggle(adm)}
                              className={`p-1.5 rounded-subtle transition-colors cursor-pointer ${
                                adm.estado?.toLowerCase() === 'activo'
                                  ? 'hover:bg-red-50 text-app-muted hover:text-red-600'
                                  : 'hover:bg-green-50 text-app-muted hover:text-green-600'
                              }`}
                              title={adm.estado?.toLowerCase() === 'activo' ? 'Desactivar cuenta' : 'Activar cuenta'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}

                          {adm.es_principal && (
                            <span className="text-[10px] text-app-muted italic px-2">
                              Inviolable
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear Administrador Adicional (Tamaño y Botones Corregidos) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Administrador General"
        subtitle="El Administrador Principal asignará las credenciales iniciales para esta cuenta adicional"
        maxWidth="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-crear-admin"
              disabled={actionLoading}
              className="px-4 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Registrando...' : 'Crear Administrador'}
            </button>
          </>
        }
      >
        <form id="form-crear-admin" onSubmit={handleCreateSubmit} autoComplete="off" className="space-y-3.5 text-xs">
          {/* Fila en 2 columnas: Nombre y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Nombre <span className="text-status-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={createData.nombre}
                  onChange={(e) => setCreateData({ ...createData, nombre: e.target.value })}
                  placeholder="Ej. Rodrigo"
                  className={`w-full pl-9 pr-3 py-2 rounded-subtle border ${
                    formErrors.nombre ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
              </div>
              {formErrors.nombre && (
                <p className="text-[11px] text-status-error mt-1">{formErrors.nombre}</p>
              )}
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Apellidos
              </label>
              <input
                type="text"
                value={createData.apellidos}
                onChange={(e) => setCreateData({ ...createData, apellidos: e.target.value })}
                placeholder="Ej. González Méndez"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>
          </div>

          {/* Correo Electrónico */}
          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Correo Electrónico <span className="text-status-error">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="off"
                value={createData.correo}
                onChange={(e) => setCreateData({ ...createData, correo: e.target.value })}
                placeholder="ejemplo.admin@sicara.gob.mx"
                className={`w-full pl-9 pr-3 py-2 rounded-subtle border ${
                  formErrors.correo ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
            </div>
            {formErrors.correo && (
              <p className="text-[11px] text-status-error mt-1">{formErrors.correo}</p>
            )}
          </div>

          {/* Banner Informativo */}
          <div className="p-3 rounded-subtle bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              <span>Asignación de Credenciales Iniciales:</span>
            </div>
            <p className="leading-relaxed">
              Proporcione una contraseña segura inicial y comuníquesela al nuevo administrador. Las contraseñas quedan almacenadas en PostgreSQL con cifrado unidireccional bcrypt.
            </p>
          </div>

          {/* Fila en 2 columnas: Contraseña Inicial y Confirmar Contraseña */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Contraseña Inicial <span className="text-status-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showCreatePass ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={createData.contrasena}
                  onChange={(e) => setCreateData({ ...createData, contrasena: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full pl-9 pr-9 py-2 rounded-subtle border ${
                    formErrors.contrasena ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePass(!showCreatePass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-muted hover:text-vino-primary cursor-pointer"
                >
                  {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.contrasena && (
                <p className="text-[11px] text-status-error mt-1">{formErrors.contrasena}</p>
              )}
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Confirmar Contraseña <span className="text-status-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showCreatePass ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={createData.confirmar_contrasena}
                  onChange={(e) => setCreateData({ ...createData, confirmar_contrasena: e.target.value })}
                  placeholder="Repita la contraseña"
                  className={`w-full pl-9 pr-3 py-2 rounded-subtle border ${
                    formErrors.confirmar_contrasena ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
              </div>
              {formErrors.confirmar_contrasena && (
                <p className="text-[11px] text-status-error mt-1">{formErrors.confirmar_contrasena}</p>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: Editar Administrador */}
      {adminToEdit && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setAdminToEdit(null);
          }}
          title="Modificar Datos de Administrador"
          subtitle={`Actualizar información de ${adminToEdit.nombre}`}
          maxWidth="max-w-lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setAdminToEdit(null);
                }}
                className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-editar-admin"
                disabled={actionLoading}
                className="px-4 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm disabled:opacity-50 cursor-pointer transition-all"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </>
          }
        >
          <form id="form-editar-admin" onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Nombre <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editData.nombre}
                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
                {editErrors.nombre && (
                  <p className="text-[11px] text-status-error mt-1">{editErrors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={editData.apellidos}
                  onChange={(e) => setEditData({ ...editData, apellidos: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Correo Electrónico <span className="text-status-error">*</span>
              </label>
              <input
                type="email"
                required
                value={editData.correo}
                onChange={(e) => setEditData({ ...editData, correo: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
              {editErrors.correo && (
                <p className="text-[11px] text-status-error mt-1">{editErrors.correo}</p>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Confirmar Activar / Desactivar Administrador Adicional */}
      <ConfirmModal
        isOpen={showToggleModal}
        onClose={() => {
          setShowToggleModal(false);
          setAdminToToggle(null);
        }}
        onConfirm={handleConfirmToggle}
        title={
          adminToToggle?.estado === 'Activo'
            ? 'Desactivar Cuenta de Administrador Adicional'
            : 'Activar Cuenta de Administrador Adicional'
        }
        message={
          adminToToggle?.estado === 'Activo'
            ? `¿Está seguro de que desea desactivar a "${adminToToggle?.nombre}" (${adminToToggle?.correo})? Esta cuenta ya no podrá iniciar sesión en SICARA hasta que sea reactivada.`
            : `¿Desea reactivar la cuenta de "${adminToToggle?.nombre}"? Podrá volver a iniciar sesión y gestionar solicitudes de escuelas.`
        }
        confirmText={adminToToggle?.estado === 'Activo' ? 'Desactivar Cuenta' : 'Activar Cuenta'}
        cancelText="Volver"
        isDanger={adminToToggle?.estado === 'Activo'}
        isLoading={actionLoading}
      />
    </div>
  );
}
