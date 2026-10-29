import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import {
  School,
  Search,
  Filter,
  Eye,
  Edit,
  Power,
  RefreshCw,
  Users,
  GraduationCap,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react';

export default function EscuelasView() {
  const { showToast } = useToast();

  const [escuelas, setEscuelas] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [selectedEscuela, setSelectedEscuela] = useState(null);
  const [schoolDetail, setSchoolDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nombre_escuela: '',
    turno: '',
    direccion: '',
    municipio: '',
    estado: 'Jalisco',
    codigo_postal: '',
    telefono: '',
    correo_institucional: '',
  });

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [escuelaToToggle, setEscuelaToToggle] = useState(null);

  const fetchEscuelas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEscuelas({
        page,
        limit,
        search,
        estado: estadoFilter,
      });

      if (res.success) {
        setEscuelas(res.escuelas);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Error al cargar escuelas:', err);
      showToast('Error al consultar escuelas registradas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, estadoFilter, showToast]);

  useEffect(() => {
    fetchEscuelas();
  }, [fetchEscuelas]);

  // Consultar detalle completo
  const handleOpenDetail = async (escuela) => {
    setSelectedEscuela(escuela);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await api.getEscuelaById(escuela.id_escuela);
      if (res.success) {
        setSchoolDetail(res);
      }
    } catch (err) {
      console.error('Error cargando detalle de escuela:', err);
      showToast('Error al cargar detalles de la escuela.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Abrir modal de edición
  const handleOpenEdit = (escuela) => {
    setSelectedEscuela(escuela);
    setEditFormData({
      nombre_escuela: escuela.nombre_escuela || '',
      turno: escuela.turno || 'Matutino',
      direccion: escuela.direccion || '',
      municipio: escuela.municipio || '',
      estado: escuela.estado || 'Jalisco',
      codigo_postal: escuela.codigo_postal || '',
      telefono: escuela.telefono || '',
      correo_institucional: escuela.correo_institucional || '',
    });
    setShowEditModal(true);
  };

  // Guardar edición
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedEscuela || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.updateEscuela(selectedEscuela.id_escuela, editFormData);
      if (res.success) {
        showToast(res.message, 'success');
        setShowEditModal(false);
        fetchEscuelas();
      }
    } catch (err) {
      console.error('Error al actualizar escuela:', err);
      showToast(err.message || 'Error al guardar cambios de la escuela.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir confirmación de toggle estado
  const handleOpenToggle = (escuela) => {
    setEscuelaToToggle(escuela);
    setShowToggleModal(true);
  };

  // Confirmar toggle estado
  const handleConfirmToggle = async () => {
    if (!escuelaToToggle || actionLoading) return;
    const nuevoEstado = escuelaToToggle.estado_escuela === 'Activa' ? 'Inactiva' : 'Activa';
    setActionLoading(true);
    try {
      const res = await api.updateEstadoEscuela(escuelaToToggle.id_escuela, nuevoEstado);
      if (res.success) {
        showToast(res.message, 'success');
        setEscuelas((prev) =>
          prev.map((e) =>
            e.id_escuela === escuelaToToggle.id_escuela
              ? { ...e, estado_escuela: nuevoEstado }
              : e
          )
        );
        setShowToggleModal(false);
        setEscuelaToToggle(null);
      }
    } catch (err) {
      console.error('Error al cambiar estado de escuela:', err);
      showToast(err.message || 'Error al cambiar estado de la escuela.', 'error');
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
            placeholder="Buscar por nombre de escuela, CCT o municipio..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-subtle border border-app-border bg-white text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-vino-primary focus:ring-2 focus:ring-vino-primary/15 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-app-bg p-1 rounded-subtle border border-app-border text-xs font-semibold">
            {['todas', 'activa', 'inactiva'].map((est) => (
              <button
                key={est}
                onClick={() => {
                  setEstadoFilter(est);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                  estadoFilter === est
                    ? 'bg-white text-vino-dark shadow-xs font-bold'
                    : 'text-app-muted hover:text-app-text'
                }`}
              >
                {est}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchEscuelas()}
            className="p-2 rounded-subtle border border-app-border bg-white text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors"
            title="Recargar escuelas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabla de Escuelas */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-2">
            <svg className="animate-spin h-6 w-6 text-vino-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Consultando catálogo de escuelas...</span>
          </div>
        ) : escuelas.length === 0 ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-vino-soft text-vino-primary">
              <School className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-app-text text-base">No hay escuelas encontradas</p>
              <p className="text-xs text-app-muted mt-0.5">
                {search || estadoFilter !== 'todas'
                  ? 'Intente modificar el criterio de búsqueda o el filtro de estado.'
                  : 'Aún no existen escuelas registradas en la base de datos.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-app-bg/60 border-b border-app-border text-app-muted uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Escuela</th>
                  <th className="py-3 px-4">CCT</th>
                  <th className="py-3 px-4">Nivel / Turno</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4 text-center">Grupos / Alumnos</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/70">
                {escuelas.map((esc) => (
                  <tr
                    key={esc.id_escuela}
                    className="hover:bg-vino-soft/20 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-app-text">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-vino-soft text-vino-primary flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{esc.nombre_escuela}</div>
                          <div className="text-[11px] font-normal text-app-muted truncate max-w-xs">
                            {esc.correo_institucional || 'Sin correo institucional'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-app-text">
                      {esc.cct}
                    </td>
                    <td className="py-3.5 px-4 text-app-text">
                      <div>{esc.nivel_educativo || 'Primaria'}</div>
                      <div className="text-[11px] text-app-muted">{esc.turno || 'Matutino'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-app-muted">
                      <div>{esc.municipio || 'Jalisco'}</div>
                      <div className="text-[11px] text-app-muted/80">{esc.estado || 'México'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-app-text text-xs font-semibold">
                        <span>{esc.total_grupos || 0} grp</span>
                        <span>•</span>
                        <span>{esc.total_alumnos || 0} alum</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={esc.estado_escuela} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(esc)}
                          className="p-1.5 rounded-subtle text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors"
                          title="Consultar detalles y grupos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(esc)}
                          className="p-1.5 rounded-subtle text-app-muted hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar información de contacto"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenToggle(esc)}
                          className={`p-1.5 rounded-subtle transition-colors ${
                            esc.estado_escuela === 'Activa'
                              ? 'text-status-error hover:bg-status-error-bg'
                              : 'text-status-success hover:bg-status-success-bg'
                          }`}
                          title={esc.estado_escuela === 'Activa' ? 'Inactivar escuela' : 'Activar escuela'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Modal Detalle Completo de Escuela */}
      {selectedEscuela && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={selectedEscuela.nombre_escuela}
          subtitle={`Clave CCT: ${selectedEscuela.cct}`}
          maxWidth="max-w-3xl"
        >
          {detailLoading ? (
            <div className="py-12 text-center text-xs text-app-muted">
              Cargando información y entidades asociadas...
            </div>
          ) : (
            <div className="space-y-5 text-xs">
              {/* Información General */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-app-bg rounded-subtle border border-app-border">
                <div>
                  <span className="text-app-muted block">Nivel y Turno:</span>
                  <span className="font-bold text-app-text">
                    {selectedEscuela.nivel_educativo} • {selectedEscuela.turno}
                  </span>
                </div>
                <div>
                  <span className="text-app-muted block">Ubicación:</span>
                  <span className="font-semibold text-app-text">
                    {selectedEscuela.municipio}, {selectedEscuela.estado}
                  </span>
                </div>
                <div>
                  <span className="text-app-muted block">Estado Actual:</span>
                  <Badge status={selectedEscuela.estado_escuela} />
                </div>
                <div className="sm:col-span-2">
                  <span className="text-app-muted block">Dirección:</span>
                  <span className="text-app-text">{selectedEscuela.direccion || 'Sin dirección registrada'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Teléfono / Correo:</span>
                  <span className="text-app-text">
                    {selectedEscuela.telefono || 'S/N'} • {selectedEscuela.correo_institucional || 'S/C'}
                  </span>
                </div>
              </div>

              {/* Directivo asignado */}
              <div className="p-3.5 bg-blue-50/60 rounded-subtle border border-blue-200">
                <span className="font-bold text-blue-900 block mb-1">Directivo Asignado:</span>
                {schoolDetail?.directivo ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-app-text text-sm">
                        {schoolDetail.directivo.nombre} {schoolDetail.directivo.apellidos || ''}
                      </p>
                      <p className="text-app-muted">{schoolDetail.directivo.correo}</p>
                    </div>
                    <Badge status={schoolDetail.directivo.estado} />
                  </div>
                ) : (
                  <p className="text-app-muted">Aún no hay una cuenta con rol Directivo asignada a este plantel.</p>
                )}
              </div>

              {/* Grupos Asociados */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-vino-dark mb-2 pb-1 border-b border-app-border flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-vino-primary" /> Grupos Registrados ({schoolDetail?.grupos?.length || 0})
                </h4>
                {schoolDetail?.grupos?.length === 0 ? (
                  <p className="text-app-muted py-2">No hay grupos registrados en este plantel.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {schoolDetail?.grupos?.map((g) => (
                      <div key={g.id_grupo} className="p-2.5 bg-gray-50 rounded-subtle border border-app-border">
                        <p className="font-bold text-app-text">{g.nombre_grupo}</p>
                        <p className="text-app-muted text-[11px]">Grado: {g.grado} • Ciclo: {g.ciclo_escolar}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Docentes Asociados */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-vino-dark mb-2 pb-1 border-b border-app-border flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-vino-primary" /> Docentes Vinculados ({schoolDetail?.docentes?.length || 0})
                </h4>
                {schoolDetail?.docentes?.length === 0 ? (
                  <p className="text-app-muted py-2">No hay docentes vinculados actualmente.</p>
                ) : (
                  <div className="space-y-2">
                    {schoolDetail?.docentes?.map((d) => (
                      <div key={d.id_docente} className="p-2.5 bg-gray-50 rounded-subtle border border-app-border flex items-center justify-between">
                        <div>
                          <p className="font-bold text-app-text">{d.nombre} {d.apellidos || ''}</p>
                          <p className="text-app-muted text-[11px]">{d.correo} • {d.especialidad || 'Docente'}</p>
                        </div>
                        <Badge status={d.estado} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal Editar Escuela */}
      {selectedEscuela && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Editar Escuela: ${selectedEscuela.nombre_escuela}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Nombre de la Escuela <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.nombre_escuela}
                onChange={(e) => setEditFormData({ ...editFormData, nombre_escuela: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Turno
                </label>
                <select
                  value={editFormData.turno}
                  onChange={(e) => setEditFormData({ ...editFormData, turno: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white"
                >
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Completo">Tiempo Completo</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Municipio
                </label>
                <input
                  type="text"
                  value={editFormData.municipio}
                  onChange={(e) => setEditFormData({ ...editFormData, municipio: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Dirección
              </label>
              <input
                type="text"
                value={editFormData.direccion}
                onChange={(e) => setEditFormData({ ...editFormData, direccion: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={editFormData.telefono}
                  onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
                />
              </div>
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Correo Institucional
                </label>
                <input
                  type="email"
                  value={editFormData.correo_institucional}
                  onChange={(e) => setEditFormData({ ...editFormData, correo_institucional: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-app-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Cambio de Estado */}
      <ConfirmModal
        isOpen={showToggleModal}
        onClose={() => {
          setShowToggleModal(false);
          setEscuelaToToggle(null);
        }}
        onConfirm={handleConfirmToggle}
        title={escuelaToToggle?.estado_escuela === 'Activa' ? 'Inactivar Escuela' : 'Activar Escuela'}
        message={`¿Está seguro de que desea cambiar el estado de la escuela "${escuelaToToggle?.nombre_escuela}" a ${
          escuelaToToggle?.estado_escuela === 'Activa' ? 'Inactiva' : 'Activa'
        }?`}
        confirmText={escuelaToToggle?.estado_escuela === 'Activa' ? 'Inactivar' : 'Activar'}
        isDanger={escuelaToToggle?.estado_escuela === 'Activa'}
        isLoading={actionLoading}
      />
    </div>
  );
}
