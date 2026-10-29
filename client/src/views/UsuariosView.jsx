import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  Power,
  RefreshCw,
  School,
  Calendar,
  Mail,
  Lock,
  Edit2,
  AlertCircle,
  Eye,
} from 'lucide-react';

export default function UsuariosView() {
  const { showToast } = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [targetUserForRole, setTargetUserForRole] = useState(null);
  const [selectedNewRole, setSelectedNewRole] = useState('Docente');

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [targetUserForToggle, setTargetUserForToggle] = useState(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsuarios({
        page,
        limit,
        search,
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
      setLoading(false);
    }
  }, [page, limit, search, rolFilter, estadoFilter, showToast]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Abrir modal de asignación de rol
  const handleOpenRoleModal = (user) => {
    if (user.rol === 'Administrador') {
      showToast('El rol del Administrador General es único y no puede modificarse.', 'warning');
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
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id_usuario === targetUserForRole.id_usuario
              ? { ...u, rol: selectedNewRole }
              : u
          )
        );
        setShowRoleModal(false);
        setTargetUserForRole(null);
      }
    } catch (err) {
      console.error('Error al actualizar rol:', err);
      showToast(err.message || 'Error al cambiar rol del usuario.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir toggle estado
  const handleOpenToggle = (user) => {
    if (user.rol === 'Administrador') {
      showToast('La cuenta del Administrador General no puede ser desactivada.', 'error');
      return;
    }
    setTargetUserForToggle(user);
    setShowToggleModal(true);
  };

  // Confirmar toggle estado
  const handleConfirmToggle = async () => {
    if (!targetUserForToggle || actionLoading) return;
    const nuevoEstado = targetUserForToggle.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setActionLoading(true);
    try {
      const res = await api.updateEstadoUsuario(targetUserForToggle.id_usuario, nuevoEstado);
      if (res.success) {
        showToast(res.message, 'success');
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id_usuario === targetUserForToggle.id_usuario
              ? { ...u, estado: nuevoEstado }
              : u
          )
        );
        setShowToggleModal(false);
        setTargetUserForToggle(null);
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      showToast(err.message || 'Error al actualizar estado del usuario.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-card p-4 sm:p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, correo o escuela..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-subtle border border-app-border bg-white text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-vino-primary focus:ring-2 focus:ring-vino-primary/15 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Rol */}
          <div className="flex items-center gap-1 bg-app-bg p-1 rounded-subtle border border-app-border text-xs font-semibold">
            {['todos', 'administrador', 'directivo', 'docente'].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRolFilter(r);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                  rolFilter === r
                    ? 'bg-white text-vino-dark shadow-xs font-bold'
                    : 'text-app-muted hover:text-app-text'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchUsuarios()}
            className="p-2 rounded-subtle border border-app-border bg-white text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors"
            title="Recargar usuarios"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-2">
            <svg className="animate-spin h-6 w-6 text-vino-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Consultando usuarios en base de datos...</span>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-vino-soft text-vino-primary">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-app-text text-base">No hay usuarios encontrados</p>
              <p className="text-xs text-app-muted mt-0.5">
                Intente ajustar los filtros de búsqueda o rol.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-app-bg/60 border-b border-app-border text-app-muted uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4">Escuela Vinculada</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/70">
                {usuarios.map((u) => {
                  const isAdmin = u.rol === 'Administrador';
                  return (
                    <tr
                      key={u.id_usuario}
                      className="hover:bg-vino-soft/20 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-app-text">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                              isAdmin
                                ? 'bg-vino-primary'
                                : u.rol === 'Directivo'
                                ? 'bg-blue-600'
                                : 'bg-teal-600'
                            }`}
                          >
                            {u.nombre?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div>{u.nombre} {u.apellidos || ''}</div>
                            {isAdmin && (
                              <span className="text-[10px] text-vino-primary font-bold">
                                Cuenta Principal del Sistema
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-app-muted font-mono text-xs">
                        {u.correo}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={u.rol} type="role" />
                      </td>
                      <td className="py-3.5 px-4 text-app-text">
                        {u.nombre_escuela ? (
                          <div>
                            <div className="font-semibold">{u.nombre_escuela}</div>
                            <div className="text-[11px] font-mono text-app-muted">{u.escuela_cct}</div>
                          </div>
                        ) : (
                          <span className="text-app-muted italic text-xs">Sin plantel asignado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={u.estado} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-subtle text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors"
                            title="Ver detalles del usuario"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Cambiar Rol (Prohibido para Admin) */}
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            disabled={isAdmin}
                            className={`p-1.5 rounded-subtle transition-colors ${
                              isAdmin
                                ? 'opacity-30 cursor-not-allowed text-app-muted'
                                : 'text-app-muted hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={
                              isAdmin
                                ? 'El rol de Administrador General es único'
                                : 'Modificar rol (Directivo / Docente)'
                            }
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Alternar Estado (Prohibido para Admin) */}
                          <button
                            onClick={() => handleOpenToggle(u)}
                            disabled={isAdmin}
                            className={`p-1.5 rounded-subtle transition-colors ${
                              isAdmin
                                ? 'opacity-30 cursor-not-allowed text-app-muted'
                                : u.estado === 'Activo'
                                ? 'text-status-error hover:bg-status-error-bg'
                                : 'text-status-success hover:bg-status-success-bg'
                            }`}
                            title={
                              isAdmin
                                ? 'La cuenta principal no se puede desactivar'
                                : u.estado === 'Activo'
                                ? 'Desactivar usuario'
                                : 'Activar usuario'
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </div>

      {/* Modal Modificar Rol */}
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
            <div className="p-3 bg-vino-soft/60 border border-vino-border rounded-subtle text-vino-dark text-[11px] leading-relaxed">
              <span className="font-bold block mb-0.5">Regla de Administrador General:</span>
              El Administrador General es una cuenta única. Solo es posible asignar o alternar entre los roles de <strong>Directivo</strong> y <strong>Docente</strong>.
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Seleccione el nuevo rol:
              </label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white font-semibold"
              >
                <option value="Directivo">Directivo (Gestión escolar de plantel)</option>
                <option value="Docente">Docente (Toma de asistencia y calificaciones)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-app-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Actualizando...' : 'Guardar Nuevo Rol'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Toggle Estado */}
      <ConfirmModal
        isOpen={showToggleModal}
        onClose={() => {
          setShowToggleModal(false);
          setTargetUserForToggle(null);
        }}
        onConfirm={handleConfirmToggle}
        title={targetUserForToggle?.estado === 'Activo' ? 'Desactivar Usuario' : 'Activar Usuario'}
        message={`¿Está seguro de que desea cambiar el estado de "${targetUserForToggle?.nombre}" a ${
          targetUserForToggle?.estado === 'Activo' ? 'Inactivo' : 'Activo'
        }?`}
        confirmText={targetUserForToggle?.estado === 'Activo' ? 'Desactivar' : 'Activar'}
        isDanger={targetUserForToggle?.estado === 'Activo'}
        isLoading={actionLoading}
      />

      {/* Modal Detalle Usuario */}
      {selectedUser && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Detalle de Usuario`}
          subtitle={`${selectedUser.nombre} ${selectedUser.apellidos || ''}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-app-bg rounded-subtle border border-app-border">
              <div>
                <span className="text-app-muted block">Rol:</span>
                <Badge status={selectedUser.rol} type="role" />
              </div>
              <div>
                <span className="text-app-muted block">Estado:</span>
                <Badge status={selectedUser.estado} />
              </div>
            </div>

            <div>
              <span className="text-app-muted block">Correo Electrónico:</span>
              <span className="font-mono font-semibold text-app-text">{selectedUser.correo}</span>
            </div>

            <div>
              <span className="text-app-muted block">Plantel Vinculado:</span>
              <span className="font-semibold text-app-text">
                {selectedUser.nombre_escuela || 'Sin escuela asignada (Administración Central)'}
              </span>
            </div>

            <div>
              <span className="text-app-muted block">Fecha de Registro:</span>
              <span className="text-app-text">
                {selectedUser.fecha_registro
                  ? new Date(selectedUser.fecha_registro).toLocaleString('es-MX')
                  : 'Sin fecha registrada'}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
