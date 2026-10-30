import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Badge';
import {
  UserCircle,
  ShieldCheck,
  Mail,
  Lock,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
  Key,
} from 'lucide-react';

export default function PerfilView() {
  const { user, updateUser, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellidos, setApellidos] = useState(user?.apellidos || '');

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre.trim()) {
      showToast('El nombre es obligatorio.', 'error');
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        showToast('Debe ingresar su contraseña actual para cambiarla.', 'error');
        return;
      }
      if (newPassword.length < 6) {
        showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('La nueva contraseña y su confirmación no coinciden.', 'error');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.updateProfile(payload);
      if (res.success) {
        showToast('Perfil de Administrador actualizado con éxito.', 'success');
        updateUser(res.user);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (refreshProfile) refreshProfile();
      }
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      showToast(err.message || 'Error al actualizar el perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tarjeta de Resumen del Administrador */}
      <div className="bg-white rounded-card p-6 border border-app-border shadow-soft flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-vino-dark via-vino to-vino-light text-white flex items-center justify-center font-extrabold text-2xl shadow-elevated shrink-0 border border-white/40">
          {user?.nombre?.charAt(0).toUpperCase() || 'A'}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-bold text-app-text">
              {user?.nombre} {user?.apellidos || ''}
            </h2>
            <Badge status={user?.rol || 'Administrador'} type="role" />
            <Badge status={user?.estado || 'Activo'} />
          </div>

          <p className="text-xs text-app-muted flex items-center justify-center sm:justify-start gap-1 font-mono">
            <Mail className="w-3.5 h-3.5" />
            <span>{user?.correo || 'Admin_Palasio@gmail.com'}</span>
          </p>

          <p className="text-xs text-app-muted pt-1">
            Cuenta de acceso principal registrada desde el{' '}
            <span className="font-semibold text-app-text">
              {user?.fecha_registro ? new Date(user.fecha_registro).toLocaleDateString('es-MX') : '2026'}
            </span>
          </p>
        </div>
      </div>

      {/* Formulario de Actualización */}
      <div className="bg-white rounded-card p-6 border border-app-border shadow-soft">
        <div className="mb-5 pb-4 border-b border-app-border">
          <h3 className="text-base font-bold text-app-text">
            Editar Datos del Administrador
          </h3>
          <p className="text-xs text-app-muted mt-0.5">
            Actualice su información personal o cambie la clave de acceso al sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Datos Personales */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-vino-dark mb-3 flex items-center gap-1.5 text-xs">
              <UserCircle className="w-4 h-4 text-vino-primary" /> Información Personal
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Nombre(s) <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Correo Electrónico (Identificador Único)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.correo || 'Admin_Palasio@gmail.com'}
                  className="w-full px-3.5 py-2.5 rounded-subtle border border-app-border bg-gray-50 text-app-muted cursor-not-allowed font-mono text-xs"
                />
                <p className="text-[11px] text-app-muted mt-1">
                  El correo principal del Administrador General está protegido por la arquitectura del sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Seguridad y Contraseña */}
          <div className="pt-4 border-t border-app-border">
            <h4 className="font-bold uppercase tracking-wider text-vino-dark mb-3 flex items-center gap-1.5 text-xs">
              <Key className="w-4 h-4 text-vino-primary" /> Modificar Contraseña (Opcional)
            </h4>
            <p className="text-app-muted mb-4 text-[11px]">
              Complete estos campos únicamente si desea cambiar su contraseña de acceso actual.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva clave"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="pt-4 border-t border-app-border flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-card transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Protección de la cuenta */}
      <div className="p-4 rounded-card bg-vino-soft/50 border border-vino-border/60 flex items-start gap-3 text-xs text-vino-dark">
        <ShieldCheck className="w-5 h-5 text-vino-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Protección de Cuenta Principal</p>
          <p className="text-app-muted leading-relaxed">
            Esta cuenta cuenta con protección integral contra borrado accidental o desactivación. El sistema garantiza la continuidad operativa asegurando que siempre exista un único Administrador General activo.
          </p>
        </div>
      </div>
    </div>
  );
}

