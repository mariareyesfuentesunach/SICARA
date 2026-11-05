import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  AlertTriangle,
  PlusCircle,
  Search,
  RefreshCw,
  Edit2,
  CheckCircle2,
  Clock,
  Layers,
  Users,
} from 'lucide-react';

export default function DirectivoAlertasView({ escuela }) {
  const { showToast } = useToast();
  const [alertas, setAlertas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAlerta, setSelectedAlerta] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario Crear Alerta
  const [createData, setCreateData] = useState({
    id_alumno: '',
    tipo_alerta: 'Inasistencias frecuentes',
    descripcion: '',
    observaciones: '',
    estado_alerta: 'Pendiente',
  });

  // Formulario Seguimiento Alerta
  const [editData, setEditData] = useState({
    estado_alerta: 'En seguimiento',
    observaciones: '',
  });

  const primaryColor = escuela?.color_primario || '#722F37';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alRes, alumRes] = await Promise.all([
        api.getDirectivoAlertas({
          q: search,
          estado: filterEstado,
          tipo: filterTipo,
        }),
        api.getDirectivoAlumnos({ estado: 'Activo' }),
      ]);

      if (alRes.success) setAlertas(alRes.alertas || []);
      if (alumRes.success) setAlumnos(alumRes.alumnos || []);
    } catch (err) {
      console.error('Error al cargar alertas:', err);
      showToast('Error al cargar lista de alertas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterEstado, filterTipo]);

  const handleOpenCreate = () => {
    setCreateData({
      id_alumno: '',
      tipo_alerta: 'Inasistencias frecuentes',
      descripcion: '',
      observaciones: '',
      estado_alerta: 'Pendiente',
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createData.id_alumno || !createData.descripcion.trim()) {
      showToast('El alumno y la descripción son obligatorios.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createDirectivoAlerta(createData);
      if (res.success) {
        showToast('Alerta escolar registrada exitosamente.', 'success');
        setShowCreateModal(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Error al generar alerta.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSeguimiento = (al) => {
    setSelectedAlerta(al);
    setEditData({
      estado_alerta: al.estado_alerta || 'En seguimiento',
      observaciones: al.observaciones || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.updateDirectivoAlerta(selectedAlerta.id_alerta, editData);
      if (res.success) {
        showToast('Seguimiento de alerta guardado.', 'success');
        setShowEditModal(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Error al actualizar alerta.', 'error');
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
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Supervisión y Seguimiento de Alertas
          </h2>
          <p className="text-xs text-app-muted">
            Monitoreo preventivo de inasistencias reiteradas, rezago escolar y canalización de alumnos
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{ backgroundColor: primaryColor }}
          className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Generar Alerta</span>
        </button>
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
            placeholder="Buscar por alumno o motivo de alerta..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
          />
        </form>

        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
        >
          <option value="todos">Todos los tipos</option>
          <option value="Inasistencias frecuentes">Inasistencias frecuentes</option>
          <option value="Bajo rendimiento académico">Bajo rendimiento académico</option>
          <option value="Disminución de asistencia">Disminución de asistencia</option>
          <option value="Requiere seguimiento">Requiere seguimiento</option>
        </select>

        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text"
        >
          <option value="todos">Todos los estados</option>
          <option value="Pendiente">Pendientes</option>
          <option value="En seguimiento">En seguimiento</option>
          <option value="Atendida">Atendidas</option>
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

      {/* Tabla de Alertas */}
      <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">Tipo de Alerta</th>
                <th className="py-3 px-4">Descripción / Situación</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-app-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                    Consultando libro de alertas escolares...
                  </td>
                </tr>
              ) : alertas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-app-muted">
                    No se registran alertas bajo los criterios indicados.
                  </td>
                </tr>
              ) : (
                alertas.map((al) => (
                  <tr key={al.id_alerta} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-app-text">{al.alumno_nombre}</div>
                      <div className="text-[11px] text-app-muted">
                        {al.nombre_grupo ? `${al.nombre_grupo} (${al.grado}°)` : 'Sin grupo'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                        {al.tipo_alerta}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-app-text font-medium">{al.descripcion}</p>
                      {al.observaciones && (
                        <p className="text-[11px] text-app-muted mt-1 italic">
                          Obs: {al.observaciones}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-app-muted">
                      {new Date(al.fecha_generacion).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          al.estado_alerta?.toLowerCase() === 'atendida'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : al.estado_alerta?.toLowerCase() === 'en seguimiento'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {al.estado_alerta || 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenSeguimiento(al)}
                        className="px-2.5 py-1 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-bold text-[11px] cursor-pointer transition-colors"
                      >
                        Seguimiento
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Generar Nueva Alerta */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generar Alerta de Seguimiento"
        subtitle="Registre una alerta sobre asistencia o desempeño para el seguimiento del alumno"
        maxWidth="max-w-lg"
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
              form="form-crear-alerta"
              disabled={actionLoading}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Registrando...' : 'Registrar Alerta'}
            </button>
          </>
        }
      >
        <form id="form-crear-alerta" onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Alumno Involucrado <span className="text-status-error">*</span>
            </label>
            <select
              required
              value={createData.id_alumno}
              onChange={(e) => setCreateData({ ...createData, id_alumno: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="">Seleccione al alumno...</option>
              {alumnos.map((a) => (
                <option key={a.id_alumno} value={a.id_alumno}>
                  {a.nombre} {a.apellidos} ({a.curp || 'S/CURP'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Tipo de Situación / Alerta
            </label>
            <select
              value={createData.tipo_alerta}
              onChange={(e) => setCreateData({ ...createData, tipo_alerta: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="Inasistencias frecuentes">Inasistencias frecuentes</option>
              <option value="Bajo rendimiento académico">Bajo rendimiento académico</option>
              <option value="Disminución de asistencia">Disminución de asistencia</option>
              <option value="Requiere seguimiento">Requiere seguimiento particular</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Descripción de la Situación <span className="text-status-error">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={createData.descripcion}
              onChange={(e) => setCreateData({ ...createData, descripcion: e.target.value })}
              placeholder="Detalle los motivos observados por el directivo o reportados por el docente..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Observaciones Iniciales de Canalización
            </label>
            <textarea
              rows={2}
              value={createData.observaciones}
              onChange={(e) => setCreateData({ ...createData, observaciones: e.target.value })}
              placeholder="Ej. Cita con padres de familia agendada, apoyo de regularización acordado..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>
        </form>
      </Modal>

      {/* MODAL: Dar Seguimiento y Actualizar Observaciones */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Seguimiento de Alerta: ${selectedAlerta?.alumno_nombre || ''}`}
        subtitle={`Tipo: ${selectedAlerta?.tipo_alerta || ''}`}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-edit-alerta"
              disabled={actionLoading}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Guardando...' : 'Actualizar Alerta'}
            </button>
          </>
        }
      >
        <form id="form-edit-alerta" onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-subtle border border-amber-200">
            <span className="font-bold text-amber-900 block">Descripción inicial:</span>
            <p className="text-amber-800 text-[11px] mt-0.5">{selectedAlerta?.descripcion}</p>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Estado de Seguimiento
            </label>
            <select
              value={editData.estado_alerta}
              onChange={(e) => setEditData({ ...editData, estado_alerta: e.target.value })}
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-xs"
            >
              <option value="Pendiente">Pendiente (Sin avances)</option>
              <option value="En seguimiento">En seguimiento (Intervención en curso)</option>
              <option value="Atendida">Atendida (Situación resuelta / archivada)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
              Observaciones y Acuerdos de Seguimiento
            </label>
            <textarea
              rows={4}
              value={editData.observaciones}
              onChange={(e) => setEditData({ ...editData, observaciones: e.target.value })}
              placeholder="Describa el seguimiento brindado, acuerdos con tutores o mejoras académicas..."
              className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

