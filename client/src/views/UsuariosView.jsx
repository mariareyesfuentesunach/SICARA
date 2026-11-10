import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import EliminarEntidadAdminModal from '../components/admin/EliminarEntidadAdminModal';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  Power,
  Trash2,
  RefreshCw,
  School,
  Calendar,
  Mail,
  Lock,
  Edit2,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Layers,
  MapPin,
  Building,
} from 'lucide-react';

export default function UsuariosView() {
  const { showToast } = useToast();

  // Modo de visualización: 'por_escuela' (predeterminado) o 'listado_general'
  const [viewMode, setViewMode] = useState('por_escuela');

  // Datos del modo por escuela
  const [escuelas, setEscuelas] = useState([]);
  const [loadingEscuelas, setLoadingEscuelas] = useState(true);
  const [selectedEscuelaId, setSelectedEscuelaId] = useState(null);
  const [searchEscuela, setSearchEscuela] = useState('');

  // Datos del modo listado general (conservado)
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [searchUser, setSearchUser] = useState('');
  const [rolFilter, setRolFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Modales de acciones sobre usuarios
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [targetUserForRole, setTargetUserForRole] = useState(null);
  const [selectedNewRole, setSelectedNewRole] = useState('Docente');
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [targetUserForToggle, setTargetUserForToggle] = useState(null);

  // 1. Cargar escuelas con usuarios
  const fetchEscuelasConUsuarios = useCallback(async () => {
    setLoadingEscuelas(true);
    try {
      const res = await api.getUsuariosPorEscuela({ search: searchEscuela });
      if (res.success) {
        setEscuelas(res.escuelas || []);
        // Si no hay ninguna seleccionada o la seleccionada ya no existe, seleccionar la primera
        if (res.escuelas && res.escuelas.length > 0) {
          setSelectedEscuelaId((prev) =>
            res.escuelas.some((e) => e.id_escuela === prev) ? prev : res.escuelas[0].id_escuela
          );
        } else {
          setSelectedEscuelaId(null);
        }
      }
    } catch (err) {
      console.error('Error al obtener escuelas con usuarios:', err);
      showToast('Error al consultar las escuelas y sus usuarios en la base de datos.', 'error');
    } finally {
      setLoadingEscuelas(false);
    }
  }, [searchEscuela, showToast]);

  // 2. Cargar listado general de usuarios
  const fetchUsuarios = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getUsuarios({
        page,
        limit,
        search: searchUser,
        rol: rolFilter,
        estado: estadoFilter,
      });

      if (res.success) {
        setUsuarios(res.usuarios);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
      showToast('Error al consultar usuarios en la base de datos.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [page, limit, searchUser, rolFilter, estadoFilter, showToast]);

  useEffect(() => {
    if (viewMode === 'por_escuela') {
      fetchEscuelasConUsuarios();
    } else {
      fetchUsuarios();
    }
  }, [viewMode, fetchEscuelasConUsuarios, fetchUsuarios]);

  // Abrir modal de asignación de rol
  const handleOpenRoleModal = (user) => {
    if (user.rol === 'Administrador') {
      showToast('Las cuentas de Administrador General deben gestionarse en su módulo exclusivo.', 'warning');
      return;
    }
    setTargetUserForRole(user);
    setSelectedNewRole(user.rol === 'Directivo' ? 'Docente' : 'Directivo');
    setShowRoleModal(true);
  };

  // Guardar nuevo rol
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!targetUserForRole || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.updateRolUsuario(targetUserForRole.id_usuario, selectedNewRole);
      if (res.success) {
        showToast(res.message, 'success');
        setShowRoleModal(false);
        setTargetUserForRole(null);
        if (viewMode === 'por_escuela') fetchEscuelasConUsuarios();
        else fetchUsuarios();
      }
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      showToast(err.message || 'Error al cambiar rol del usuario.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir modal de activar/inactivar
  const handleOpenToggle = (user) => {
    if (user.rol === 'Administrador') {
      showToast('Las cuentas de Administrador General se gestionan en su módulo exclusivo.', 'warning');
      return;
    }
    setTargetUserForToggle(user);
    setShowToggleModal(true);
  };

  // Confirmar activar/inactivar
  const handleConfirmToggle = async () => {
    if (!targetUserForToggle || actionLoading) return;
    const nuevoEstado = targetUserForToggle.estado === 'Activo' ? 'Inactivo' : 'Activo';

    setActionLoading(true);
    try {
      const res = await api.updateEstadoUsuario(targetUserForToggle.id_usuario, nuevoEstado);
      if (res.success) {
        showToast(res.message, nuevoEstado === 'Activo' ? 'success' : 'warning');
        setShowToggleModal(false);
        setTargetUserForToggle(null);
        if (viewMode === 'por_escuela') fetchEscuelasConUsuarios();
        else fetchUsuarios();
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      showToast(err.message || 'Error al actualizar estado del usuario.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reenviar correo de activación
  const handleReenviarActivacion = async (user) => {
    if (!user || actionLoading) return;

    if (user.cuenta_activada === true) {
      showToast(`La cuenta de ${user.nombre} ya se encuentra activada.`, 'info');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.reenviarActivacionUsuario(user.id_usuario);
      if (res.success) {
        showToast(res.message || 'Correo de activación reenviado exitosamente.', 'success');
        if (viewMode === 'por_escuela') fetchEscuelasConUsuarios();
        else fetchUsuarios();
      }
    } catch (err) {
      console.error('Error al reenviar activación:', err);
      showToast(err.message || 'No se pudo enviar el correo de activación.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedEscuela = escuelas.find((e) => e.id_escuela === selectedEscuelaId) || null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra Superior con Selector de Modo y Búsqueda */}
      <div className="bg-white rounded-card p-4 sm:p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Selector de Modo */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-vino-soft text-vino-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-app-text">Gestión y Consulta de Usuarios</h2>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setViewMode('por_escuela')}
                className={`text-xs px-2.5 py-1 rounded-subtle font-semibold transition-all cursor-pointer ${
                  viewMode === 'por_escuela'
                    ? 'bg-vino-primary text-white shadow-xs font-bold'
                    : 'bg-app-bg text-app-muted hover:text-vino-dark hover:bg-gray-200'
                }`}
              >
                Organización por Escuela
              </button>
              <button
                onClick={() => setViewMode('listado_general')}
                className={`text-xs px-2.5 py-1 rounded-subtle font-semibold transition-all cursor-pointer ${
                  viewMode === 'listado_general'
                    ? 'bg-vino-primary text-white shadow-xs font-bold'
                    : 'bg-app-bg text-app-muted hover:text-vino-dark hover:bg-gray-200'
                }`}
              >
                Listado General de Cuentas
              </button>
            </div>
          </div>
        </div>

        {/* Buscador y Controles */}
        <div className="flex items-center gap-3">
          {viewMode === 'por_escuela' ? (
            <div className="relative flex-1 sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchEscuela}
                onChange={(e) => setSearchEscuela(e.target.value)}
                placeholder="Buscar escuela, CCT, profesor o directivo..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-app-text"
              />
            </div>
          ) : (
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchUser}
                onChange={(e) => {
                  setSearchUser(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar usuario o correo..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-app-text"
              />
            </div>
          )}

          <button
            onClick={() => (viewMode === 'por_escuela' ? fetchEscuelasConUsuarios() : fetchUsuarios())}
            className="p-2 rounded-subtle border border-app-border text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors cursor-pointer"
            title="Recargar"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                (viewMode === 'por_escuela' ? loadingEscuelas : loadingUsers) ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: ORGANIZACIÓN POR ESCUELA (REQUERIMIENTO PRINCIPAL) */}
      {/* ============================================================== */}
      {viewMode === 'por_escuela' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Listado de Escuelas con Usuarios */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-vino-dark uppercase tracking-wider flex items-center gap-1.5">
                <School className="w-4 h-4 text-vino-primary" />
                Escuelas con Personal Asignado ({escuelas.length})
              </span>
            </div>

            {loadingEscuelas ? (
              <div className="bg-white rounded-card p-12 text-center text-app-muted text-xs border border-app-border flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-vino-primary border-t-transparent rounded-full animate-spin" />
                <span>Cargando planteles desde PostgreSQL...</span>
              </div>
            ) : escuelas.length === 0 ? (
              <div className="bg-white rounded-card p-8 text-center text-app-muted text-xs border border-app-border">
                <Building className="w-8 h-8 text-vino-primary/40 mx-auto mb-2" />
                <p className="font-bold text-app-text">No se encontraron escuelas con usuarios</p>
                <p className="text-[11px] mt-1">Verifique el criterio de búsqueda o asocie usuarios a escuelas.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
                {escuelas.map((esc) => {
                  const isSelected = selectedEscuelaId === esc.id_escuela;
                  return (
                    <div
                      key={esc.id_escuela}
                      onClick={() => setSelectedEscuelaId(esc.id_escuela)}
                      className={`p-4 rounded-card border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-gradient-to-r from-vino-soft/80 to-white border-vino-primary shadow-md ring-1 ring-vino-primary/20'
                          : 'bg-white border-app-border hover:border-vino-border hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <h3
                            className={`text-sm font-bold truncate ${
                              isSelected ? 'text-vino-dark' : 'text-app-text'
                            }`}
                          >
                            {esc.nombre_escuela}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-app-muted flex-wrap">
                            <span className="font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                              CCT: {esc.cct}
                            </span>
                            <span>•</span>
                            <span>{esc.municipio || 'Jalisco'}</span>
                            <span>•</span>
                            <span>{esc.nivel_educativo || 'Primaria'}</span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 shrink-0 transition-transform ${
                            isSelected ? 'text-vino-primary translate-x-1' : 'text-gray-300'
                          }`}
                        />
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-app-border/60 flex items-center justify-between text-[11px]">
                        <span className="text-app-muted">
                          Directivo:{' '}
                          <strong className={esc.directivo ? 'text-vino-dark' : 'text-amber-700 font-normal italic'}>
                            {esc.directivo ? `${esc.directivo.nombre} ${esc.directivo.apellidos || ''}` : 'Sin asignar'}
                          </strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-vino-soft text-vino-dark font-bold text-[10px]">
                          {esc.profesores?.length || 0} docente(s)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna Derecha: Detalle de Usuarios del Plantel Seleccionado */}
          <div className="lg:col-span-7">
            {selectedEscuela ? (
              <div className="bg-white rounded-card border border-app-border shadow-soft p-5 sm:p-6 space-y-6">
                {/* Encabezado del Plantel */}
                <div className="pb-4 border-b border-app-border flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-vino-soft text-vino-primary mb-2">
                      <School className="w-3.5 h-3.5" />
                      <span>Plantel Seleccionado</span>
                    </div>
                    <h2 className="text-lg font-bold text-vino-dark leading-tight">
                      {selectedEscuela.nombre_escuela}
                    </h2>
                    <p className="text-xs text-app-muted mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-gray-700">CCT: {selectedEscuela.cct}</span>
                      <span>•</span>
                      <span>{selectedEscuela.nivel_educativo} ({selectedEscuela.turno})</span>
                      <span>•</span>
                      <span>{selectedEscuela.municipio}, {selectedEscuela.estado || 'Jalisco'}</span>
                    </p>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700 shrink-0">
                    {selectedEscuela.totalUsuarios} usuario(s) en total
                  </span>
                </div>

                {/* SECCIÓN 1: DIRECTIVO ENCARGADO */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-vino-dark flex items-center gap-2 pb-1 border-b border-app-border/80">
                    <UserCheck className="w-4 h-4 text-vino-primary" />
                    Directivo Encargado del Plantel
                  </h4>

                  {selectedEscuela.directivo ? (
                    <div className="p-4 rounded-subtle bg-gradient-to-r from-amber-50/40 via-white to-white border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-vino-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {selectedEscuela.directivo.nombre ? selectedEscuela.directivo.nombre[0].toUpperCase() : 'D'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-app-text">
                              {selectedEscuela.directivo.nombre} {selectedEscuela.directivo.apellidos || ''}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Directivo Oficial
                            </span>
                            <Badge
                              type={selectedEscuela.directivo.estado === 'Activo' ? 'success' : 'error'}
                              text={selectedEscuela.directivo.estado || 'Activo'}
                            />
                          </div>
                          <div className="text-xs text-app-muted flex items-center gap-1.5 mt-0.5 font-mono">
                            <Mail className="w-3.5 h-3.5 text-app-muted" />
                            <span>{selectedEscuela.directivo.correo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {selectedEscuela.directivo.cuenta_activada === false && (
                          <button
                            onClick={() => handleReenviarActivacion(selectedEscuela.directivo)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-xs font-bold rounded-subtle bg-vino-primary hover:bg-vino-hover text-white shadow-xs cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Reenviar enlace de activación"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Reenviar activación</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenRoleModal(selectedEscuela.directivo)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-subtle border border-app-border text-app-muted hover:text-vino-primary hover:border-vino-primary cursor-pointer transition-colors"
                          title="Modificar rol"
                        >
                          Cambiar Rol
                        </button>
                        <button
                          onClick={() => handleOpenToggle(selectedEscuela.directivo)}
                          className={`p-1.5 rounded-subtle transition-colors cursor-pointer ${
                            selectedEscuela.directivo.estado === 'Activo'
                              ? 'text-app-muted hover:text-red-600 hover:bg-red-50'
                              : 'text-app-muted hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={selectedEscuela.directivo.estado === 'Activo' ? 'Inactivar directivo' : 'Activar directivo'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-subtle bg-gray-50 border border-dashed border-gray-300 text-center text-xs text-app-muted">
                      <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                      <p className="font-bold text-app-text">No hay directivo asignado</p>
                      <p className="text-[11px] mt-0.5">
                        Esta escuela no cuenta con una cuenta de usuario con rol de Directivo asociada en la base de datos.
                      </p>
                    </div>
                  )}
                </div>

                {/* SECCIÓN 2: PROFESORES REGISTRADOS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-app-border/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-vino-dark flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-vino-primary" />
                      Profesores Registrados ({selectedEscuela.profesores?.length || 0})
                    </h4>
                  </div>

                  {selectedEscuela.profesores && selectedEscuela.profesores.length > 0 ? (
                    <div className="divide-y divide-app-border border border-app-border rounded-subtle overflow-hidden">
                      {selectedEscuela.profesores.map((prof) => (
                        <div
                          key={prof.id_usuario}
                          className="p-3.5 bg-white hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-vino-soft text-vino-primary font-bold flex items-center justify-center text-xs shrink-0">
                              {prof.nombre ? prof.nombre[0].toUpperCase() : 'P'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-app-text">
                                  {prof.nombre} {prof.apellidos || ''}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  {prof.especialidad || 'Docente General'}
                                </span>
                                <Badge
                                  type={prof.estado === 'Activo' ? 'success' : 'error'}
                                  text={prof.estado || 'Activo'}
                                />
                              </div>
                              <div className="text-[11px] text-app-muted flex items-center gap-2 mt-0.5 font-mono">
                                <span>{prof.correo}</span>
                                {prof.telefono_docente && (
                                  <>
                                    <span>•</span>
                                    <span>Tel: {prof.telefono_docente}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <button
                              onClick={() => handleOpenRoleModal(prof)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-subtle border border-app-border text-app-muted hover:text-vino-primary hover:border-vino-primary cursor-pointer transition-colors"
                              title="Modificar rol a Directivo"
                            >
                              Cambiar Rol
                            </button>
                            <button
                              onClick={() => handleOpenToggle(prof)}
                              className={`p-1.5 rounded-subtle transition-colors cursor-pointer ${
                                prof.estado === 'Activo'
                                  ? 'text-app-muted hover:text-red-600 hover:bg-red-50'
                                  : 'text-app-muted hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={prof.estado === 'Activo' ? 'Inactivar profesor' : 'Activar profesor'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-subtle bg-gray-50 border border-dashed border-gray-300 text-center text-xs text-app-muted">
                      <GraduationCap className="w-6 h-6 text-app-muted/60 mx-auto mb-1.5" />
                      <p className="font-bold text-app-text">No hay profesores registrados</p>
                      <p className="text-[11px] mt-0.5">
                        Actualmente esta escuela no cuenta con docentes vinculados en la base de datos de SICARA.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-card border border-app-border p-12 text-center text-app-muted text-xs">
                Seleccione una escuela de la lista para ver su directivo y profesores registrados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: LISTADO GENERAL TABULAR (COMPATIBILIDAD CONSERVADA) */}
      {/* ============================================================== */}
      {viewMode === 'listado_general' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white p-3 rounded-card border border-app-border text-xs">
            <span className="font-bold text-app-muted uppercase">Filtrar por Rol:</span>
            {['todos', 'Directivo', 'Docente'].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRolFilter(r);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-subtle font-semibold capitalize transition-all cursor-pointer ${
                  rolFilter === r ? 'bg-vino-primary text-white font-bold' : 'text-app-muted hover:bg-gray-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-app-bg/60 border-b border-app-border text-app-muted uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Escuela Vinculada</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/70">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-app-muted">
                        Consultando usuarios en base de datos...
                      </td>
                    </tr>
                  ) : usuarios.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-app-muted">
                        No hay usuarios encontrados.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id_usuario} className="hover:bg-vino-soft/20 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-app-text">
                          {u.nombre} {u.apellidos || ''}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-app-text">{u.correo}</td>
                        <td className="py-3.5 px-4 font-semibold text-xs">{u.rol}</td>
                        <td className="py-3.5 px-4 text-xs text-app-muted">
                          {u.nombre_escuela ? `${u.nombre_escuela} (${u.escuela_cct})` : 'Sin asignar'}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status={u.estado} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {u.rol !== 'Administrador' && (
                              <>
                                {u.cuenta_activada === false && (
                                  <button
                                    onClick={() => handleReenviarActivacion(u)}
                                    disabled={actionLoading}
                                    className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary cursor-pointer disabled:opacity-50"
                                    title="Reenviar correo de activación"
                                  >
                                    <Mail className="w-4 h-4 text-vino-primary" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenRoleModal(u)}
                                  className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-vino-primary cursor-pointer"
                                  title="Modificar rol"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenToggle(u)}
                                  className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-red-600 cursor-pointer"
                                  title={u.estado === 'Activo' ? 'Inactivar' : 'Activar'}
                                >
                                  <Power className="w-4 h-4" />
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

            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* MODAL: Modificar Rol de Usuario */}
      {targetUserForRole && (
        <Modal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setTargetUserForRole(null);
          }}
          title="Modificar Rol de Usuario"
          subtitle={`Usuario: ${targetUserForRole.nombre} ${targetUserForRole.apellidos || ''}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Rol Asignado en SICARA
              </label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value)}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white"
              >
                <option value="Directivo">Directivo (Encargado del plantel)</option>
                <option value="Docente">Docente (Profesor frente a grupo)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-app-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setTargetUserForRole(null);
                }}
                className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Actualizando...' : 'Guardar Nuevo Rol'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Confirmar Activar / Inactivar Usuario */}
      <ConfirmModal
        isOpen={showToggleModal}
        onClose={() => {
          setShowToggleModal(false);
          setTargetUserForToggle(null);
        }}
        onConfirm={handleConfirmToggle}
        title={targetUserForToggle?.estado === 'Activo' ? 'Desactivar Cuenta de Usuario' : 'Activar Cuenta de Usuario'}
        message={`¿Está seguro de que desea ${
          targetUserForToggle?.estado === 'Activo' ? 'desactivar' : 'activar'
        } la cuenta de "${targetUserForToggle?.nombre} ${targetUserForToggle?.apellidos || ''}" (${
          targetUserForToggle?.correo
        })?`}
        confirmText={targetUserForToggle?.estado === 'Activo' ? 'Desactivar' : 'Activar'}
        cancelText="Volver"
        isDanger={targetUserForToggle?.estado === 'Activo'}
        isLoading={actionLoading}
      />
    </div>
  );
}
