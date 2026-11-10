import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, Trash2, X, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export default function EliminarModalDirectivo({
  isOpen,
  onClose,
  onConfirm,
  tipo, // 'alumno', 'docente', 'grupo', 'materia'
  id,
  nombre,
  isLoading = false,
}) {
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [dependencias, setDependencias] = useState(null);

  useEffect(() => {
    if (isOpen && tipo && id) {
      setLoadingDeps(true);
      setDependencias(null);
      api.getDirectivoDependencias(tipo, id)
        .then((res) => {
          if (res.success) {
            setDependencias(res);
          }
        })
        .catch((err) => {
          console.warn('Error al consultar dependencias:', err);
        })
        .finally(() => {
          setLoadingDeps(false);
        });
    }
  }, [isOpen, tipo, id]);

  if (!isOpen) return null;

  const tipoLabels = {
    alumno: 'Alumno',
    docente: 'Docente',
    grupo: 'Grupo',
    materia: 'Materia',
  };

  const entityTitle = tipoLabels[tipo] || 'Registro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-elevated border border-app-border overflow-hidden animate-scale-in">
        {/* Cabecera */}
        <div className="p-5 border-b border-app-border flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                Eliminar {entityTitle} del Sistema
              </h3>
              <p className="text-[11px] text-gray-500">Módulo Directivo Institucional</p>
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

        {/* Cuerpo */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-gray-700 text-sm">
            ¿Está seguro de que desea eliminar a <strong className="text-gray-900">{nombre || dependencias?.nombre}</strong> del sistema?
          </p>

          {/* Estado de carga de dependencias */}
          {loadingDeps && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-gray-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-vino-primary" />
              <span>Verificando vínculos y dependencias académicas...</span>
            </div>
          )}

          {/* Advertencia de Relaciones e Impacto */}
          {!loadingDeps && dependencias && dependencias.tieneRelaciones && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Advertencia de relaciones vinculadas:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
                {dependencias.relaciones.map((rel, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {rel}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-900/90 pt-1 border-t border-amber-200/60 leading-normal">
                {dependencias.advertencia}
              </p>
            </div>
          )}

          {/* Salvaguarda de Respaldo en Base de Datos */}
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-sky-900 leading-relaxed">
              <strong>Protección y Respaldo de Datos:</strong> Esta acción dará de baja al {entityTitle.toLowerCase()} dentro de las listas y operaciones activas del sistema, pero <strong>NO eliminará la información de la base de datos</strong>. Todo su historial permanecerá resguardado.
            </div>
          </div>
        </div>

        {/* Acciones */}
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
            onClick={onConfirm}
            disabled={isLoading || loadingDeps}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Sí, eliminar del sistema</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

