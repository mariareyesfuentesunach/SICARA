import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  RefreshCw,
  School,
  Calendar,
  MapPin,
  Mail,
  Phone,
  User,
  AlertCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export default function SolicitudesView({ onRefreshDashboard }) {
  const { showToast } = useToast();

  const [solicitudes, setSolicitudes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Modal para Aprobar con Confirmación previa
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [solicitudToApprove, setSolicitudToApprove] = useState(null);

  // Modal para Rechazar con Motivo Obligatorio y Confirmación
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [solicitudToReject, setSolicitudToReject] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulario de nueva solicitud
  const [newFormData, setNewFormData] = useState({
    nombre_escuela: '',
    cct: '',
    nivel_educativo: 'Primaria',
    turno: 'Matutino',
    direccion: '',
    municipio: '',
    estado: 'Jalisco',
    codigo_postal: '',
    telefono: '',
    correo_institucional: '',
    nombre_responsable: '',
    correo_responsable: '',
    telefono_responsable: '',
  });

  const [createErrors, setCreateErrors] = useState({});

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSolicitudes({
        page,
        limit,
        search,
        estado: estadoFilter,
      });

      if (res.success) {
        setSolicitudes(res.solicitudes);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Error obteniendo solicitudes:', err);
      showToast('Error al consultar las solicitudes de la base de datos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, estadoFilter, showToast]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // Abrir confirmación de aprobación
  const handleOpenApprove = (solicitud) => {
    setSolicitudToApprove(solicitud);
    setShowApproveModal(true);
  };

  // Confirmar y procesar aprobación
  const handleConfirmApprove = async () => {
    if (!solicitudToApprove || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.aprobarSolicitud(solicitudToApprove.id_solicitud);
      if (res.success) {
        showToast(res.message, 'success');
        setSolicitudes((prev) =>
          prev.map((s) =>
            s.id_solicitud === solicitudToApprove.id_solicitud
              ? {
                  ...s,
                  estado_solicitud: 'Aprobada',
                  motivo_rechazo: null,
                  fecha_resolucion: new Date().toISOString(),
                }
              : s
          )
        );
        if (selectedSolicitud && selectedSolicitud.id_solicitud === solicitudToApprove.id_solicitud) {
          setSelectedSolicitud((prev) => ({
            ...prev,
            estado_solicitud: 'Aprobada',
            motivo_rechazo: null,
            fecha_resolucion: new Date().toISOString(),
          }));
        }
        setShowApproveModal(false);
        setSolicitudToApprove(null);
        if (onRefreshDashboard) onRefreshDashboard();
      }
    } catch (err) {
      console.error('Error al aprobar solicitud:', err);
      showToast(err.message || 'Error al aprobar la solicitud.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir modal de rechazo
  const handleOpenReject = (solicitud) => {
    setSolicitudToReject(solicitud);
    setShowRejectModal(true);
  };

  // Confirmar rechazo con motivo justificado obligatorio
  const handleConfirmReject = async (motivo) => {
    if (!solicitudToReject || actionLoading) return;
    if (!motivo || !motivo.trim()) {
      showToast('El motivo del rechazo es obligatorio.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.rechazarSolicitud(solicitudToReject.id_solicitud, motivo.trim());
      if (res.success) {
        showToast(res.message, 'warning');
        setSolicitudes((prev) =>
          prev.map((s) =>
            s.id_solicitud === solicitudToReject.id_solicitud
              ? {
                  ...s,
                  estado_solicitud: 'Rechazada',
                  motivo_rechazo: motivo.trim(),
                  fecha_resolucion: new Date().toISOString(),
                }
              : s
          )
        );
        if (selectedSolicitud && selectedSolicitud.id_solicitud === solicitudToReject.id_solicitud) {
          setSelectedSolicitud((prev) => ({
            ...prev,
            estado_solicitud: 'Rechazada',
            motivo_rechazo: motivo.trim(),
            fecha_resolucion: new Date().toISOString(),
          }));
        }
        setShowRejectModal(false);
        setSolicitudToReject(null);
        if (onRefreshDashboard) onRefreshDashboard();
      }
    } catch (err) {
      console.error('Error al rechazar solicitud:', err);
      showToast(err.message || 'Error al rechazar la solicitud.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Validación estricta del formulario de nueva solicitud
  const validateNewSolicitud = () => {
    const errors = {};

    // Nombre de escuela
    if (!newFormData.nombre_escuela.trim()) {
      errors.nombre_escuela = 'El nombre de la escuela es obligatorio.';
    } else if (newFormData.nombre_escuela.trim().length > 150) {
      errors.nombre_escuela = 'Máximo 150 caracteres.';
    }

    // CCT oficial SEP (10 caracteres alfanuméricos)
    const cctRegex = /^[0-9]{2}[A-Za-z]{3}[0-9]{4}[A-Za-z]$/;
    if (!newFormData.cct.trim()) {
      errors.cct = 'La clave CCT es obligatoria.';
    } else if (!cctRegex.test(newFormData.cct.trim())) {
      errors.cct = 'Formato inválido. Debe tener 10 caracteres oficiales SEP (ej. 14DPR1234K).';
    }

    // Teléfono institucional (10 dígitos)
    if (newFormData.telefono.trim()) {
      const telClean = newFormData.telefono.trim().replace(/\D/g, '');
      if (telClean.length !== 10) {
        errors.telefono = 'Debe tener exactamente 10 dígitos numéricos.';
      }
    }

    // Código postal (5 dígitos)
    if (newFormData.codigo_postal.trim()) {
      if (!/^\d{5}$/.test(newFormData.codigo_postal.trim())) {
        errors.codigo_postal = 'El código postal debe contener 5 dígitos numéricos.';
      }
    }

    // Correo institucional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newFormData.correo_institucional.trim()) {
      if (!emailRegex.test(newFormData.correo_institucional.trim().toLowerCase())) {
        errors.correo_institucional = 'Formato de correo electrónico inválido.';
      }
    }

    // Responsable
    if (!newFormData.nombre_responsable.trim()) {
      errors.nombre_responsable = 'El nombre del directivo o responsable es obligatorio.';
    } else if (newFormData.nombre_responsable.trim().length > 150) {
      errors.nombre_responsable = 'Máximo 150 caracteres.';
    }

    // Correo responsable
    if (!newFormData.correo_responsable.trim()) {
      errors.correo_responsable = 'El correo del responsable es obligatorio.';
    } else if (!emailRegex.test(newFormData.correo_responsable.trim().toLowerCase())) {
      errors.correo_responsable = 'Formato de correo electrónico inválido.';
    }

    // Teléfono responsable (10 dígitos)
    if (newFormData.telefono_responsable.trim()) {
      const telRespClean = newFormData.telefono_responsable.trim().replace(/\D/g, '');
      if (telRespClean.length !== 10) {
        errors.telefono_responsable = 'Debe tener exactamente 10 dígitos numéricos.';
      }
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Crear nueva solicitud
  const handleCreateSolicitud = async (e) => {
    e.preventDefault();
    if (!validateNewSolicitud() || actionLoading) return;

    setActionLoading(true);
    try {
      const res = await api.createSolicitud(newFormData);
      if (res.success) {
        showToast(res.message, 'success');
        setShowCreateModal(false);
        setNewFormData({
          nombre_escuela: '',
          cct: '',
          nivel_educativo: 'Primaria',
          turno: 'Matutino',
          direccion: '',
          municipio: '',
          estado: 'Jalisco',
          codigo_postal: '',
          telefono: '',
          correo_institucional: '',
          nombre_responsable: '',
          correo_responsable: '',
          telefono_responsable: '',
        });
        setCreateErrors({});
        fetchSolicitudes();
        if (onRefreshDashboard) onRefreshDashboard();
      }
    } catch (err) {
      console.error('Error creando solicitud:', err);
      showToast(err.message || 'Error al registrar la solicitud.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (solicitud) => {
    setSelectedSolicitud(solicitud);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros, Búsqueda y Acción */}
      <div className="bg-white rounded-card p-4 sm:p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Input Búsqueda */}
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
            placeholder="Buscar por escuela, CCT, municipio o director..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-subtle border border-app-border bg-white text-app-text placeholder:text-app-muted focus:outline-none focus:border-vino-primary focus:ring-1 focus:ring-vino-primary transition-all"
          />
        </div>

        {/* Filtros por Estado */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center bg-app-bg p-1 rounded-subtle border border-app-border text-xs font-semibold">
            {['todas', 'Pendiente', 'Aprobada', 'Rechazada'].map((est) => (
              <button
                key={est}
                onClick={() => {
                  setEstadoFilter(est);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-sm capitalize transition-all cursor-pointer ${
                  estadoFilter === est
                    ? 'bg-white text-vino-dark font-bold shadow-xs'
                    : 'text-app-muted hover:text-app-text'
                }`}
              >
                {est}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchSolicitudes()}
            className="p-2 rounded-subtle border border-app-border bg-white text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setCreateErrors({});
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Solicitud</span>
          </button>
        </div>
      </div>

      {/* Tabla de Solicitudes */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-2">
            <svg className="animate-spin h-6 w-6 text-vino-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Cargando solicitudes de la base de datos...</span>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="py-16 text-center text-app-muted text-sm flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-vino-soft text-vino-primary">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-app-text text-base">No se encontraron solicitudes</p>
              <p className="text-xs text-app-muted mt-0.5">
                {search || estadoFilter !== 'todas'
                  ? 'Intente modificar los filtros o el texto de búsqueda.'
                  : 'No hay solicitudes registradas actualmente en la base de datos.'}
              </p>
            </div>
            <button
              onClick={() => {
                setCreateErrors({});
                setShowCreateModal(true);
              }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-subtle bg-vino-primary text-white text-xs font-semibold hover:bg-vino-hover cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Registrar Solicitud de Prueba
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-app-bg/60 border-b border-app-border text-app-muted uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Escuela</th>
                  <th className="py-3 px-4">CCT</th>
                  <th className="py-3 px-4">Nivel</th>
                  <th className="py-3 px-4">Municipio</th>
                  <th className="py-3 px-4">Fecha Solicitud</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/70">
                {solicitudes.map((sol) => {
                  const isPendiente = (sol.estado_solicitud || '').toLowerCase() === 'pendiente';
                  return (
                    <tr
                      key={sol.id_solicitud}
                      className="hover:bg-vino-soft/20 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-app-text">
                        <div>{sol.nombre_escuela}</div>
                        <div className="text-[11px] font-normal text-app-muted truncate max-w-xs">
                          {sol.nombre_responsable ? `Resp: ${sol.nombre_responsable}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-app-text">
                        {sol.cct || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-app-text">
                        {sol.nivel_educativo || 'Primaria'}
                      </td>
                      <td className="py-3.5 px-4 text-app-muted">
                        {sol.municipio || 'Jalisco'}
                      </td>
                      <td className="py-3.5 px-4 text-app-muted text-xs">
                        {sol.fecha_solicitud
                          ? new Date(sol.fecha_solicitud).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'S/F'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={sol.estado_solicitud} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver Detalles */}
                          <button
                            onClick={() => handleOpenDetail(sol)}
                            className="p-1.5 rounded-subtle text-app-muted hover:text-vino-primary hover:bg-vino-soft transition-colors cursor-pointer"
                            title="Ver detalles completos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Acciones para solicitudes pendientes */}
                          {isPendiente && (
                            <>
                              <button
                                onClick={() => handleOpenApprove(sol)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-subtle bg-status-success-bg hover:bg-green-200 text-status-success text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                title="Aprobar solicitud y registrar escuela"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Aprobar</span>
                              </button>
                              <button
                                onClick={() => handleOpenReject(sol)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-subtle bg-status-error-bg hover:bg-red-200 text-status-error text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                title="Rechazar solicitud con motivo"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Rechazar</span>
                              </button>
                            </>
                          )}
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

      {/* Modal Detalle de Solicitud */}
      {selectedSolicitud && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Detalle de Solicitud: ${selectedSolicitud.nombre_escuela}`}
          subtitle={`Folio ID: ${selectedSolicitud.id_solicitud}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-sm">
            {/* Estado y Acciones Rápidas */}
            <div className="flex items-center justify-between p-3.5 rounded-subtle bg-app-bg border border-app-border">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-app-muted uppercase">Estado:</span>
                <Badge status={selectedSolicitud.estado_solicitud} />
              </div>
              <div className="text-xs text-app-muted">
                Fecha:{' '}
                <span className="font-semibold text-app-text">
                  {selectedSolicitud.fecha_solicitud
                    ? new Date(selectedSolicitud.fecha_solicitud).toLocaleString('es-MX')
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Banner de Resolución si ya fue aprobada o rechazada */}
            {selectedSolicitud.fecha_resolucion && (
              <div
                className={`p-3 rounded-subtle border text-xs flex items-start gap-2.5 ${
                  selectedSolicitud.estado_solicitud === 'Aprobada'
                    ? 'bg-status-success-bg/60 border-status-success-border text-status-success'
                    : 'bg-status-error-bg/60 border-status-error-border text-status-error'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">
                    Resolución registrada el{' '}
                    {new Date(selectedSolicitud.fecha_resolucion).toLocaleString('es-MX')}
                    {selectedSolicitud.admin_resolucion_nombre
                      ? ` por ${selectedSolicitud.admin_resolucion_nombre}`
                      : ''}
                  </div>
                  {selectedSolicitud.motivo_rechazo && (
                    <div className="text-app-text font-medium mt-1">
                      <strong>Motivo de rechazo:</strong> {selectedSolicitud.motivo_rechazo}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Si está rechazada pero no tenía fecha guardada */}
            {!selectedSolicitud.fecha_resolucion && selectedSolicitud.motivo_rechazo && (
              <div className="p-3.5 rounded-subtle bg-status-error-bg border border-status-error-border text-status-error text-xs">
                <span className="font-bold block mb-1">Motivo del Rechazo:</span>
                <p className="text-app-text leading-relaxed font-medium">{selectedSolicitud.motivo_rechazo}</p>
              </div>
            )}

            {/* Información del Plantel */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-vino-dark mb-2.5 pb-1 border-b border-app-border flex items-center gap-1.5">
                <School className="w-4 h-4 text-vino-primary" /> Datos del Plantel Rural
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-app-muted block">Clave CCT:</span>
                  <span className="font-mono font-bold text-app-text">{selectedSolicitud.cct || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Nivel Educativo:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.nivel_educativo || 'Primaria'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Turno:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.turno || 'Matutino'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Municipio / Estado:</span>
                  <span className="font-semibold text-app-text">
                    {selectedSolicitud.municipio || 'N/A'}, {selectedSolicitud.estado || 'Jalisco'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-app-muted block">Dirección / Comunidad:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.direccion || 'Domicilio Conocido S/N'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Código Postal:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.codigo_postal || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Teléfono del Plantel:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.telefono || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-app-muted block">Correo Institucional:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.correo_institucional || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Datos del Responsable */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-vino-dark mb-2.5 pb-1 border-b border-app-border flex items-center gap-1.5">
                <User className="w-4 h-4 text-vino-primary" /> Responsable Directivo Solicitante
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-app-muted block">Nombre Completo:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.nombre_responsable || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Correo de Contacto:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.correo_responsable || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-app-muted block">Teléfono Celular:</span>
                  <span className="font-semibold text-app-text">{selectedSolicitud.telefono_responsable || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Botones de acción dentro del modal si está pendiente */}
            {(selectedSolicitud.estado_solicitud || '').toLowerCase() === 'pendiente' && (
              <div className="pt-4 border-t border-app-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenReject(selectedSolicitud)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-subtle bg-status-error-bg hover:bg-red-200 text-status-error text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Rechazar Solicitud
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenApprove(selectedSolicitud)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-subtle bg-status-success hover:bg-green-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Aprobar Solicitud
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de Confirmación para Aprobar */}
      <ConfirmModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSolicitudToApprove(null);
        }}
        onConfirm={handleConfirmApprove}
        title="Aprobar Solicitud de Escuela"
        message={`¿Está seguro de que desea aprobar la solicitud para "${solicitudToApprove?.nombre_escuela}"? Esta acción incorporará el plantel al catálogo de escuelas oficiales de SICARA y activará la cuenta directiva de ${solicitudToApprove?.nombre_responsable || 'responsable'}.`}
        confirmText="Aprobar e Incorporar"
        cancelText="Volver"
        isDanger={false}
        isLoading={actionLoading}
      />

      {/* Modal de Confirmación y Motivo Obligatorio para Rechazar */}
      <ConfirmModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSolicitudToReject(null);
        }}
        onConfirm={handleConfirmReject}
        title="Rechazar Solicitud de Escuela"
        message={`¿Está seguro de que desea rechazar la solicitud para "${solicitudToReject?.nombre_escuela}"? Debe justificar el motivo para informar al plantel solicitante.`}
        confirmText="Confirmar Rechazo"
        cancelText="Volver"
        isDanger={true}
        isLoading={actionLoading}
        requireReason={true}
        reasonLabel="Motivo justificado del rechazo"
        reasonPlaceholder="Ej. Clave CCT no coincide con el catálogo oficial o la documentación comunitaria está incompleta..."
      />

      {/* Modal para Crear Nueva Solicitud con Validaciones Robustas */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Registrar Nueva Solicitud de Escuela"
        subtitle="Permite dar de alta una nueva solicitud rural que se validará y guardará directamente en PostgreSQL"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSolicitud} noValidate className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nombre Escuela */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Nombre de la Escuela <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={newFormData.nombre_escuela}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, nombre_escuela: e.target.value });
                  if (createErrors.nombre_escuela) setCreateErrors({ ...createErrors, nombre_escuela: '' });
                }}
                placeholder="Ej. Primaria Rural Miguel Hidalgo"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.nombre_escuela ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
              {createErrors.nombre_escuela && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.nombre_escuela}</p>
              )}
            </div>

            {/* CCT */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Clave CCT <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={newFormData.cct}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, cct: e.target.value.toUpperCase() });
                  if (createErrors.cct) setCreateErrors({ ...createErrors, cct: '' });
                }}
                placeholder="Ej. 14DPR1234K"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.cct ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary font-mono text-xs uppercase`}
              />
              {createErrors.cct && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.cct}</p>
              )}
            </div>

            {/* Nivel Educativo */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Nivel Educativo
              </label>
              <select
                value={newFormData.nivel_educativo}
                onChange={(e) => setNewFormData({ ...newFormData, nivel_educativo: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white"
              >
                <option value="Preescolar">Preescolar</option>
                <option value="Primaria">Primaria</option>
                <option value="Secundaria">Secundaria</option>
                <option value="Telesecundaria">Telesecundaria</option>
              </select>
            </div>

            {/* Turno */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Turno
              </label>
              <select
                value={newFormData.turno}
                onChange={(e) => setNewFormData({ ...newFormData, turno: e.target.value })}
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white"
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Completo">Tiempo Completo</option>
              </select>
            </div>

            {/* Municipio */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Municipio
              </label>
              <input
                type="text"
                value={newFormData.municipio}
                onChange={(e) => setNewFormData({ ...newFormData, municipio: e.target.value })}
                placeholder="Ej. Tapalpa"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>

            {/* Dirección */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Dirección / Comunidad
              </label>
              <input
                type="text"
                maxLength={200}
                value={newFormData.direccion}
                onChange={(e) => setNewFormData({ ...newFormData, direccion: e.target.value })}
                placeholder="Ej. Domicilio Conocido S/N, Ejido Las Canoas"
                className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
              />
            </div>

            {/* Teléfono Institucional */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Teléfono Institucional (10 dígitos)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={newFormData.telefono}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, telefono: e.target.value.replace(/\D/g, '') });
                  if (createErrors.telefono) setCreateErrors({ ...createErrors, telefono: '' });
                }}
                placeholder="Ej. 3434251122"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.telefono ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
              {createErrors.telefono && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.telefono}</p>
              )}
            </div>

            {/* Código Postal */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Código Postal (5 dígitos)
              </label>
              <input
                type="text"
                maxLength={5}
                value={newFormData.codigo_postal}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, codigo_postal: e.target.value.replace(/\D/g, '') });
                  if (createErrors.codigo_postal) setCreateErrors({ ...createErrors, codigo_postal: '' });
                }}
                placeholder="Ej. 49340"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.codigo_postal ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
              {createErrors.codigo_postal && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.codigo_postal}</p>
              )}
            </div>

            {/* Correo Institucional */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Correo Institucional
              </label>
              <input
                type="email"
                value={newFormData.correo_institucional}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, correo_institucional: e.target.value });
                  if (createErrors.correo_institucional) setCreateErrors({ ...createErrors, correo_institucional: '' });
                }}
                placeholder="escuela@jalisco.edu.mx"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.correo_institucional ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
              {createErrors.correo_institucional && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.correo_institucional}</p>
              )}
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-app-border font-bold text-vino-dark flex items-center gap-1.5">
              <User className="w-4 h-4 text-vino-primary" />
              <span>Datos del Director / Responsable</span>
            </div>

            {/* Nombre del Responsable */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Nombre del Responsable <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={newFormData.nombre_responsable}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, nombre_responsable: e.target.value });
                  if (createErrors.nombre_responsable) setCreateErrors({ ...createErrors, nombre_responsable: '' });
                }}
                placeholder="Ej. Profr. Juan Manuel Ortiz"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.nombre_responsable ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
              {createErrors.nombre_responsable && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.nombre_responsable}</p>
              )}
            </div>

            {/* Correo del Responsable */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Correo del Responsable <span className="text-status-error">*</span>
              </label>
              <input
                type="email"
                required
                value={newFormData.correo_responsable}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, correo_responsable: e.target.value });
                  if (createErrors.correo_responsable) setCreateErrors({ ...createErrors, correo_responsable: '' });
                }}
                placeholder="director.contacto@gmail.com"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.correo_responsable ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
              {createErrors.correo_responsable && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.correo_responsable}</p>
              )}
            </div>

            {/* Teléfono Responsable */}
            <div>
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                Teléfono Celular Responsable (10 dígitos)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={newFormData.telefono_responsable}
                onChange={(e) => {
                  setNewFormData({ ...newFormData, telefono_responsable: e.target.value.replace(/\D/g, '') });
                  if (createErrors.telefono_responsable) setCreateErrors({ ...createErrors, telefono_responsable: '' });
                }}
                placeholder="Ej. 3431029384"
                className={`w-full px-3 py-2 rounded-subtle border ${
                  createErrors.telefono_responsable ? 'border-status-error' : 'border-app-border'
                } focus:outline-none focus:border-vino-primary text-xs`}
              />
              {createErrors.telefono_responsable && (
                <p className="text-[11px] text-status-error mt-1">{createErrors.telefono_responsable}</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-app-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Registrando...' : 'Registrar Solicitud'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
