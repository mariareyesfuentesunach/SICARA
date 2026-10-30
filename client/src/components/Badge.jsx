import React from 'react';
import { CheckCircle2, Clock, XCircle, ShieldCheck, UserCheck, GraduationCap } from 'lucide-react';

export default function Badge({ status, type = 'status' }) {
  if (!status) return null;

  const normalized = status.toString().trim().toLowerCase();

  // Roles
  if (type === 'role') {
    if (normalized === 'administrador') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-vino-soft text-vino-primary border border-vino-border">
          <ShieldCheck className="w-3.5 h-3.5" />
          Administrador General
        </span>
      );
    }
    if (normalized === 'directivo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <GraduationCap className="w-3.5 h-3.5" />
          Directivo
        </span>
      );
    }
    if (normalized === 'docente') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <UserCheck className="w-3.5 h-3.5" />
          Docente
        </span>
      );
    }
  }

  // Estados
  if (['aprobada', 'activa', 'activo', 'resuelta'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-success-bg text-status-success border border-status-success-border">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }

  if (['rechazada', 'inactiva', 'inactivo'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-error-bg text-status-error border border-status-error-border">
        <XCircle className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }

  if (['pendiente', 'en revision', 'en revisión'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-warning-bg text-status-warning border border-status-warning-border">
        <Clock className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      {status}
    </span>
  );
}

