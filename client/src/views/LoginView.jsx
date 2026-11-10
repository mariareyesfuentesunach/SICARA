import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function LoginView({ initialEmail = '', onGoToRecuperar }) {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [correo, setCorreo] = useState(initialEmail || '');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sincronizar o inicializar con initialEmail
  useEffect(() => {
    if (initialEmail) {
      setCorreo(initialEmail);
    }
    setContrasena('');
    setErrorMessage('');
  }, [initialEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = correo.trim();
    if (!cleanEmail || !contrasena) {
      setErrorMessage('Por favor ingrese tanto el correo electrónico como la contraseña.');
      return;
    }

    if (contrasena.length > 72) {
      setErrorMessage('La contraseña no puede exceder los 72 caracteres permitidos.');
      return;
    }

    setLoading(true);

    try {
      await login(cleanEmail, contrasena);
      showToast('Bienvenido al panel del Administrador General', 'success');
      // Limpiar estados de memoria tras éxito
      setCorreo('');
      setContrasena('');
    } catch (err) {
      // Limpiar contraseña de la memoria ante fallo de autenticación
      setContrasena('');
      const msg = err.message || 'Error al iniciar sesión. Verifique sus credenciales.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col justify-center items-center p-4 selection:bg-vino-soft selection:text-vino-dark">
      {/* Background ambient accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-vino/10 via-vino/5 to-transparent pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-vino-dark via-vino to-vino-light text-white shadow-elevated mb-4 border border-white/40">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-vino-dark">
            SICARA
          </h1>
          <p className="text-xs font-semibold text-vino-primary uppercase tracking-widest mt-1">
            Control de Asistencia y Rendimiento Académico
          </p>
          <p className="text-xs text-app-muted mt-0.5">
            Plataforma Institucional para Escuelas Rurales
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-card shadow-elevated border border-app-border p-8 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-app-text">Iniciar Sesión</h2>
            <p className="text-xs text-app-muted mt-1">
              Ingrese con sus credenciales de Directivo o Administrador
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-subtle bg-status-error-bg border border-status-error-border text-status-error flex items-start gap-2.5 text-xs font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Campo Correo */}
            <div>
              <label className="block text-xs font-bold text-app-text mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  autoComplete="off"
                  disabled={loading}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-subtle border border-app-border bg-white text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-vino-primary focus:ring-2 focus:ring-vino-primary/15 transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-xs font-bold text-app-text mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-app-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="••••••••"
                  required
                  maxLength={72}
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-subtle border border-app-border bg-white text-app-text placeholder:text-app-muted/60 focus:outline-none focus:border-vino-primary focus:ring-2 focus:ring-vino-primary/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {onGoToRecuperar && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={onGoToRecuperar}
                    className="text-[11px] font-semibold text-vino-primary hover:text-vino-dark hover:underline transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>

            {/* Botón Iniciar Sesión */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-subtle bg-gradient-to-r from-vino-dark to-vino hover:from-vino hover:to-vino-light text-white font-bold text-sm shadow-card hover:shadow-elevated transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Validando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-app-muted">
          SICARA © {new Date().getFullYear()} — Plataforma de Gestión Escolar para Comunidades Rurales
        </div>
      </div>
    </div>
  );
}
