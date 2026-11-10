import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  Trash2,
  X,
  ShieldAlert,
  Send,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

export default function EliminarEntidadAdminModal({
  isOpen,
  onClose,
  tipo = 'Escuela', // 'Escuela' | 'Directivo'
  entidad,
  isPrincipal = false,
  onEliminarDirecto,
  onSolicitarAutorizacion,
  isLoading = false,
}) {
  const [respaldoDescargado, setRespaldoDescargado] = useState(false);
  const [descargandoRespaldo, setDescargandoRespaldo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  if (!isOpen || !entidad) return null;

  const handleDownloadBackup = async () => {
    setDescargandoRespaldo(true);
    try {
      const endpoint =
        tipo === 'Escuela'
          ? `/api/escuelas/${entidad.id_escuela}/respaldo`
          : `/api/usuarios/${entidad.id_usuario}/respaldo`;

      const token = localStorage.getItem('sicara_token') || localStorage.getItem('token');
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('No fue posible descargar el archivo de respaldo.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (entidad.nombre_escuela || entidad.nombre || 'respaldo').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `respaldo_${tipo.toLowerCase()}_${cleanName}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setRespaldoDescargado(true);
    } catch (err) {
      console.error('Error al descargar respaldo:', err);
      alert(err.message || 'Error al descargar respaldo.');
    } finally {
      setDescargandoRespaldo(false);
    }
  };

  const handleSubmitSecondary = (e) => {
    e.preventDefault();
    if (!motivo.trim()) return;
    onSolicitarAutorizacion({
      tipo_entidad: tipo,
      id_entidad: tipo === 'Escuela' ? entidad.id_escuela : entidad.id_usuario,
      nombre_entidad: tipo === 'Escuela' ? entidad.nombre_escuela : `${entidad.nombre} ${entidad.apellidos || ''}`.trim(),
      motivo: motivo.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-elevated border border-app-border overflow-hidden animate-scale-in">
        {/* Cabecera */}
        <div className="p-5 border-b border-app-border flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {isPrincipal
                  ? `Eliminar ${tipo} de la Base de Datos`
                  : `Solicitar Autorización para Eliminar ${tipo}`}
              </h3>
              <p className="text-[11px] text-gray-500">Módulo de Control y Gobernanza SICARA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido según rol */}
        <div className="p-6 space-y-4 text-xs">
          {/* Tarjeta de resumen de la entidad */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              {tipo === 'Escuela' ? 'Escuela seleccionada' : 'Directivo seleccionado'}
            </span>
            <h4 className="text-sm font-bold text-gray-900">
              {tipo === 'Escuela' ? entidad.nombre_escuela : `${entidad.nombre} ${entidad.apellidos || ''}`}
            </h4>
            <p className="text-xs text-gray-600 mt-0.5">
              {tipo === 'Escuela' ? (
                <>
                  CCT: <span className="font-mono font-bold">{entidad.cct || 'S/N'}</span> • Ubicación:{' '}
                  {entidad.municipio || 'Chiapas'}
                </>
              ) : (
                <>
                  Correo: <span className="font-mono">{entidad.correo}</span> • Escuela:{' '}
                  {entidad.nombre_escuela || 'Plantel no asignado'}
                </>
              )}
            </p>

            {tipo === 'Escuela' && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200 text-center">
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block">Grupos</span>
                  <span className="text-xs font-bold text-gray-800">{entidad.total_grupos ?? '0'}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block">Alumnos</span>
                  <span className="text-xs font-bold text-gray-800">{entidad.total_alumnos ?? '0'}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block">Docentes</span>
                  <span className="text-xs font-bold text-gray-800">{entidad.total_docentes ?? '0'}</span>
                </div>
              </div>
            )}
          </div>

          {/* CASO A: ADMINISTRADOR PRINCIPAL */}
          {isPrincipal ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>¿Desea respaldar toda su información antes de proceder?</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Al eliminar esta {tipo.toLowerCase()} desde la base de datos se suprimirán sus registros
                  asociados. Puede descargar un respaldo íntegro en formato JSON con toda su historia académica.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={descargandoRespaldo}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-emerald-50 border border-emerald-500 text-emerald-700 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    {descargandoRespaldo ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Generando Respaldo...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>
                          {respaldoDescargado ? '✔ Respaldo Descargado (Volver a descargar)' : 'Descargar Respaldo Completo (.JSON)'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmación explícita */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-[11px] text-gray-700 leading-normal">
                  Entiendo que la eliminación en la base de datos es definitiva. Confirmo que deseo proceder
                  {respaldoDescargado ? ' con el respaldo descargado.' : ' sin respaldar o asumiendo la eliminación total.'}
                </span>
              </label>
            </div>
          ) : (
            /* CASO B: ADMINISTRADOR SECUNDARIO (SOLICITA AUTORIZACIÓN) */
            <form onSubmit={handleSubmitSecondary} className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong>Control de Autorización Requerido:</strong> Como administrador secundario, usted no tiene
                  facultad para eliminar registros de la base de datos directamente. Debe enviar una solicitud de
                  eliminación con el motivo justificado al <strong>Administrador Principal</strong> para que él lo autorice y ejecute.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Motivo y justificación de la eliminación *
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Explique detalladamente por qué se requiere dar de baja esta escuela o directivo..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-vino-primary focus:ring-1 focus:ring-vino-primary bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !motivo.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-vino-primary hover:bg-vino-dark transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Solicitud al Administrador Principal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer para Administrador Principal */}
        {isPrincipal && (
          <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onEliminarDirecto(tipo === 'Escuela' ? entidad.id_escuela : entidad.id_usuario)}
              disabled={isLoading || !confirmCheckbox}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm cursor-pointer disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Eliminando de la BD...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Definitivamente</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

