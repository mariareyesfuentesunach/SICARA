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
  ClipboardList,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Clock,
} from 'lucide-react';

export default function AdministradoresView() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [administradores, setAdministradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isPrincipal, setIsPrincipal] = useState(false);

  // Pestañas (Administradores / Solicitudes de Eliminación)
  const [activeTab, setActiveTab] = useState('administradores');
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [solicitudToReject, setSolicitudToReject] = useState(null);
  const [observacionesRechazo, setObservacionesRechazo] = useState('');

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

  const fetchSolicitudes = useCallback(async () => {
    setLoadingSolicitudes(true);
    try {
      const res = await api.getSolicitudesEliminacion();
      if (res.success) {
        setSolicitudes(res.solicitudes || []);
      }
    } catch (err) {
      console.error('Error al consultar solicitudes de eliminación:', err);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, []);

  useEffect(() => {
    fetchAdministradores();
    fetchSolicitudes();
  }, [fetchAdministradores, fetchSolicitudes]);

  const handleDescargarRespaldoSolicitud = async (solicitud) => {
    try {
      const token = localStorage.getItem('sicara_token');
      const url =
        solicitud.tipo_entidad === 'Escuela'
          ? `/api/escuelas/${solicitud.id_entidad}/respaldo`
          : `/api/usuarios/${solicitud.id_entidad}/respaldo`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('No se pudo generar el respaldo de la base de datos.');
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `RESPALDO_BD_${solicitud.tipo_entidad.toUpperCase()}_${solicitud.id_entidad}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast('Respaldo descargado exitosamente.', 'success');
    } catch (err) {
      console.error('Error al descargar respaldo:', err);
      showToast(err.message || 'Error al descargar respaldo.', 'error');
    }
  };

  const handleAprobarSolicitud = async (solicitud) => {
    if (!window.confirm(`¿Está seguro de APROBAR y ELIMINAR permanentemente ${solicitud.tipo_entidad}: "${solicitud.nombre_entidad}" de la base de datos? Esta acción es irreversible.`)) {
      return;
    }
    setResolvingId(solicitud.id_solicitud);
    try {
      const res = await api.resolverSolicitudEliminacion(solicitud.id_solicitud, { accion: 'Aprobar' });
      if (res.success) {
        showToast(res.message || 'Solicitud aprobada y entidad eliminada de la base de datos.', 'success');
        fetchSolicitudes();
      }
    } catch (err) {
      console.error('Error al aprobar solicitud:', err);
      showToast(err.message || 'Error al aprobar solicitud.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const handleOpenRechazar = (solicitud) => {
    setSolicitudToReject(solicitud);
    setObservacionesRechazo('');
    setShowRejectModal(true);
  };

  const handleConfirmRechazo = async (e) => {
    e.preventDefault();
    if (!solicitudToReject) return;
    setResolvingId(solicitudToReject.id_solicitud);
    try {
      const res = await api.resolverSolicitudEliminacion(solicitudToReject.id_solicitud, {
        accion: 'Rechazar',
        observaciones: observacionesRechazo,
      });
      if (res.success) {
        showToast(res.message || 'Solicitud rechazada.', 'info');
        setShowRejectModal(false);
        setSolicitudToReject(null);
        fetchSolicitudes();
      }
    } catch (err) {
      console.error('Error al rechazar solicitud:', err);
      showToast(err.message || 'Error al procesar rechazo.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

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

  const pendientesCount = solicitudes.filter((s) => s.estado === 'Pendiente').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pestañas de Navegación */}
      <div className="flex items-center gap-2 border-b border-app-border pb-2">
        <button
          onClick={() => setActiveTab('administradores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'administradores'
              ? 'bg-white text-vino-primary border-b-2 border-vino-primary shadow-xs'
              : 'text-app-muted hover:text-vino-dark hover:bg-gray-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Cuentas de Administradores ({administradores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('solicitudes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-bold transition-colors cursor-pointer relative ${
            activeTab === 'solicitudes'
              ? 'bg-white text-vino-primary border-b-2 border-vino-primary shadow-xs'
              : 'text-app-muted hover:text-vino-dark hover:bg-gray-100'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Solicitudes de Eliminación</span>
          {pendientesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
              {pendientesCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'administradores' ? (
        <>
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
      </>
      ) : (
        /* VISTA: Pestaña de Solicitudes de Eliminación */
        <div className="space-y-4">
          <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-vino-primary" />
                Bandeja de Autorizaciones de Eliminación
              </h2>
              <p className="text-xs text-app-muted mt-0.5">
                {isPrincipal
                  ? 'Como Administrador Principal, dictamine las solicitudes de borrado definitivo en base de datos emitidas por administradores secundarios.'
                  : 'Historial de solicitudes de borrado enviadas al Administrador Principal para su revisión.'}
              </p>
            </div>
            <button
              onClick={fetchSolicitudes}
              disabled={loadingSolicitudes}
              className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary hover:border-vino-primary transition-colors cursor-pointer"
              title="Recargar solicitudes"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSolicitudes ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-app-bg/60 border-b border-app-border text-app-muted uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Entidad Solicitada</th>
                    <th className="py-3 px-4">Solicitante</th>
                    <th className="py-3 px-4">Motivo del Borrado</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/70">
                  {loadingSolicitudes ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-app-muted">
                        Cargando solicitudes de eliminación...
                      </td>
                    </tr>
                  ) : solicitudes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-app-muted">
                        No hay solicitudes de eliminación registradas.
                      </td>
                    </tr>
                  ) : (
                    solicitudes.map((sol) => (
                      <tr key={sol.id_solicitud} className="hover:bg-vino-soft/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-app-text flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sol.tipo_entidad === 'Escuela'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {sol.tipo_entidad}
                            </span>
                            <span>{sol.nombre_entidad}</span>
                          </div>
                          <span className="text-[11px] text-app-muted font-mono">ID: {sol.id_entidad}</span>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-app-text">{sol.nombre_solicitante || 'Administrador'}</div>
                          <div className="text-app-muted text-[11px]">{sol.correo_solicitante}</div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-app-muted max-w-xs break-words">
                          <p className="italic bg-gray-50 p-2 rounded border border-gray-200">
                            "{sol.motivo}"
                          </p>
                          {sol.observaciones_resolucion && (
                            <p className="text-[10px] text-red-600 mt-1">
                              <strong>Dictamen:</strong> {sol.observaciones_resolucion}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-app-muted">
                          {sol.fecha_solicitud
                            ? new Date(sol.fecha_solicitud).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              sol.estado === 'Pendiente'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : sol.estado === 'Aprobada'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {sol.estado}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Descargar respaldo si está pendiente */}
                            {sol.estado === 'Pendiente' && (
                              <button
                                onClick={() => handleDescargarRespaldoSolicitud(sol)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-subtle border border-app-border text-gray-700 hover:text-vino-primary hover:border-vino-primary flex items-center gap-1 transition-colors cursor-pointer"
                                title="Descargar Respaldo JSON de la BD"
                              >
                                <Download className="w-3.5 h-3.5 text-vino-primary" />
                                <span>Respaldo</span>
                              </button>
                            )}

                            {isPrincipal && sol.estado === 'Pendiente' && (
                              <>
                                <button
                                  onClick={() => handleAprobarSolicitud(sol)}
                                  disabled={resolvingId === sol.id_solicitud}
                                  className="px-2.5 py-1 text-xs font-bold rounded-subtle bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                  title="Aprobar y Eliminar de la Base de Datos"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aprobar Borrado</span>
                                </button>
                                <button
                                  onClick={() => handleOpenRechazar(sol)}
                                  disabled={resolvingId === sol.id_solicitud}
                                  className="px-2.5 py-1 text-xs font-bold rounded-subtle border border-gray-300 hover:bg-gray-100 text-gray-700 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Rechazar solicitud"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Rechazar</span>
                                </button>
                              </>
                            )}
                          </div>
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

      {/* MODAL: Guardar Administrador Adicional (Ventana Flotante Amplia como Solicitudes de Escuelas) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Administrador General"
        subtitle="El Administrador Principal asignará las credenciales iniciales para esta cuenta adicional"
        maxWidth="max-w-3xl"
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
              className="px-5 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {actionLoading ? 'Registrando...' : 'Guardar Administrador'}
            </button>
          </>
        }
      >
        <form id="form-crear-admin" onSubmit={handleCreateSubmit} autoComplete="off" className="space-y-4 text-xs">
          {/* Bloque 1: Datos Personales y de Contacto */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-vino-dark uppercase tracking-wider pb-1 border-b border-app-border">
              <User className="w-4 h-4 text-vino-primary" />
              <span>Datos Personales y de Identificación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
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
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
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

              <div className="sm:col-span-2">
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
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
            </div>
          </div>

          {/* Bloque 2: Credenciales de Seguridad */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-vino-dark uppercase tracking-wider pb-1 border-b border-app-border">
              <KeyRound className="w-4 h-4 text-vino-primary" />
              <span>Credenciales de Seguridad</span>
            </div>

            {/* Banner Informativo */}
            <div className="p-3 rounded-subtle bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold">Asignación de Credenciales Iniciales:</strong> Proporcione una contraseña segura inicial y comuníquesela al nuevo administrador. Las contraseñas quedan almacenadas en PostgreSQL con cifrado seguro unidireccional bcrypt.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
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
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
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
          </div>
        </form>
      </Modal>

      {/* MODAL: Editar Administrador (Ventana Flotante Amplia) */}
      {adminToEdit && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setAdminToEdit(null);
          }}
          title="Modificar Datos de Administrador"
          subtitle={`Actualizar información de ${adminToEdit.nombre}`}
          maxWidth="max-w-3xl"
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
                className="px-5 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm disabled:opacity-50 cursor-pointer transition-all"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </>
          }
        >
          <form id="form-editar-admin" onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-vino-dark uppercase tracking-wider pb-1 border-b border-app-border">
              <User className="w-4 h-4 text-vino-primary" />
              <span>Datos del Administrador</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Nombre <span className="text-status-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={editData.nombre}
                    onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                  />
                </div>
                {editErrors.nombre && (
                  <p className="text-[11px] text-status-error mt-1">{editErrors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={editData.apellidos}
                  onChange={(e) => setEditData({ ...editData, apellidos: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Correo Electrónico <span className="text-status-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={editData.correo}
                    onChange={(e) => setEditData({ ...editData, correo: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                  />
                </div>
                {editErrors.correo && (
                  <p className="text-[11px] text-status-error mt-1">{editErrors.correo}</p>
                )}
              </div>
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

      {/* MODAL: Rechazar Solicitud de Eliminación */}
      {showRejectModal && solicitudToReject && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSolicitudToReject(null);
          }}
          title="Rechazar Solicitud de Eliminación"
          subtitle={`Se notificará el motivo del rechazo al solicitante (${solicitudToReject.nombre_solicitante || 'Administrador'})`}
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setSolicitudToReject(null);
                }}
                className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRechazo}
                disabled={resolvingId === solicitudToReject.id_solicitud}
                className="px-4 py-2 rounded-subtle bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {resolvingId === solicitudToReject.id_solicitud ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-app-text">
              Indique las razones u observaciones por las cuales no procede la eliminación de{' '}
              <strong>{solicitudToReject.tipo_entidad}</strong>: <em>{solicitudToReject.nombre_entidad}</em>.
            </p>
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Motivo / Justificación del Rechazo:
              </label>
              <textarea
                value={observacionesRechazo}
                onChange={(e) => setObservacionesRechazo(e.target.value)}
                placeholder="Ejemplo: La escuela cuenta con trámites y registros activos del ciclo actual..."
                rows={3}
                className="w-full p-2.5 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

