import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  isLoading = false,
  requireReason = false,
  reasonPlaceholder = 'Explique el motivo...',
  reasonLabel = 'Motivo justificado',
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Este campo es obligatorio para continuar.');
      return;
    }
    setError('');
    onConfirm(requireReason ? reason.trim() : true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-full shrink-0 ${isDanger ? 'bg-status-error-bg text-status-error' : 'bg-status-warning-bg text-status-warning'}`}>
            {isDanger ? <AlertCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div className="text-sm text-app-text leading-relaxed">
            {message}
          </div>
        </div>

        {requireReason && (
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-app-text uppercase tracking-wider">
              {reasonLabel} <span className="text-status-error">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={reasonPlaceholder}
              disabled={isLoading}
              className={`w-full px-3.5 py-2.5 text-sm rounded-subtle border bg-white focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-status-error focus:ring-status-error/20'
                  : 'border-app-border focus:border-vino-primary focus:ring-vino-primary/20'
              }`}
            />
            {error && (
              <p className="text-xs text-status-error font-medium">{error}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-app-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-app-text bg-gray-100 hover:bg-gray-200 rounded-subtle transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-subtle shadow-sm transition-all disabled:opacity-50 ${
              isDanger
                ? 'bg-status-error hover:bg-red-700'
                : 'bg-vino-primary hover:bg-vino-hover'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Procesando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
