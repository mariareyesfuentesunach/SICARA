import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  GraduationCap,
  School,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Mail,
} from 'lucide-react';

export default function ActivacionView({ token, onCancel }) {
  const { setSession } = useAuth();
  const { showToast } = useToast();

  const [verificando, setVerificando] = useState(true);
  const [errorToken, setErrorToken] = useState(null); // 'TOKEN_INVALIDO', 'TOKEN_EXPIRADO', etc.
  const [datosEscuela, setDatosEscuela] = useState(null);

  // Campos de formulario
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [exitoActivacion, setExitoActivacion] = useState(false);

  // Estado para solicitud de nuevo enlace si expiró
  const [correoSolicitud, setCorreoSolicitud] = useState('');
  const [enviandoNuevo, setEnviandoNuevo] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  // 1. Verificar token al montar
  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setVerificando(false);
      setErrorToken('TOKEN_INVALIDO');
      return;
    }

    api.verificarTokenActivacion(token)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setDatosEscuela(res.data);
          setCorreoSolicitud(res.data.correo || '');
          setErrorToken(null);
        } else {
          setErrorToken('TOKEN_INVALIDO');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err.data && err.data.code === 'TOKEN_EXPIRADO') {
          setErrorToken('TOKEN_EXPIRADO');
          if (err.data.correo) setCorreoSolicitud(err.data.correo);
        } else {
          setErrorToken('TOKEN_INVALIDO');
        }
      })
      .finally(() => {
        if (isMounted) setVerificando(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Requisitos de seguridad individuales
  const reqLength = contrasena.length >= 8;
  const reqUpper = /[A-Z]/.test(contrasena);
  const reqLower = /[a-z]/.test(contrasena);
  const reqNumber = /\d/.test(contrasena);
  const reqSpecial = /[^a-zA-Z\d\s]/.test(contrasena);

  const cumplidos = [reqLength, reqUpper, reqLower, reqNumber, reqSpecial].filter(Boolean).length;
  const contrasenasCoinciden = contrasena.length > 0 && contrasena === confirmarContrasena;
  const esValida = cumplidos === 5 && contrasenasCoinciden;

  // Fortaleza de la contraseña: débil, media o fuerte
  const fortaleza = useMemo(() => {
    if (!contrasena) return null;
    if (cumplidos <= 2) return { label: 'Débil', color: 'text-red-600', bg: 'bg-red-500', w: 'w-1/3' };
    if (cumplidos <= 4) return { label: 'Media', color: 'text-amber-600', bg: 'bg-amber-500', w: 'w-2/3' };
    return { label: 'Fuerte', color: 'text-emerald-700', bg: 'bg-emerald-600', w: 'w-full' };
  }, [contrasena, cumplidos]);

  // 3. Manejador de Activación
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!esValida || loadingAction) return;

    setLoadingAction(true);
    try {
      const res = await api.completarActivacion({
        token,
        contrasena,
        confirmarContrasena,
      });

      if (res.success && res.token && res.user) {
        setExitoActivacion(true);
        showToast('¡Tu cuenta ha sido activada correctamente! Bienvenido a SICARA.', 'success');

        // Breve retraso visual de 1.8 segundos antes de iniciar sesión automáticamente
        setTimeout(() => {
          // Limpiar el parámetro de la URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Iniciar sesión automáticamente -> Redirige de inmediato al panel de su escuela
          setSession(res.token, res.user);
        }, 1800);
      }
    } catch (err) {
      console.error('Error al activar cuenta:', err);
      showToast(err.message || 'Error al procesar la activación.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // 4. Solicitar nuevo enlace si el token expiró
  const handleSolicitarNuevo = async (e) => {
    e.preventDefault();
    if (!correoSolicitud || enviandoNuevo) return;
    setEnviandoNuevo(true);
    try {
      const res = await api.solicitarNuevoEnlaceActivacion(correoSolicitud);
      if (res.success) {
        setSolicitudEnviada(true);
        showToast('Se ha enviado un nuevo enlace de activación a su correo.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error al solicitar el enlace.', 'error');
    } finally {
      setEnviandoNuevo(false);
    }
  };

  // Render: Cargando verificación
  if (verificando) {
    return (
      <div className="min-h-screen bg-[#F8F5F5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#722F37] flex items-center justify-center text-white mb-4 shadow-elevated animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#4A1722]">SICARA</h2>
        <p className="text-xs text-[#685D68] mt-1">Verificando enlace de activación institucional...</p>
      </div>
    );
  }

  // Render: Éxito con redirección automática en curso
  if (exitoActivacion) {
    return (
      <div className="min-h-screen bg-[#F8F5F5] flex flex-col items-center justify-center p-4 selection:bg-[#722F37] selection:text-white">
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-[24px] shadow-elevated border border-[#E8E2E4] p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-[#4A1722]">¡Cuenta Activada!</h2>
          <p className="text-sm font-semibold text-emerald-800 mt-2">
            ¡Tu cuenta ha sido activada correctamente! Bienvenido a SICARA.
          </p>
          <p className="text-xs text-[#685D68] mt-3">
            Iniciando sesión automáticamente en el portal de su escuela...
          </p>
          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-3 border-[#722F37] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Render: Token inválido o expirado
  if (errorToken) {
    return (
      <div className="min-h-screen bg-[#F8F5F5] flex flex-col items-center justify-center p-4 selection:bg-[#722F37] selection:text-white">
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-[24px] shadow-elevated border border-[#E8E2E4] p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-9 h-9" />
          </div>

          <h2 className="text-xl font-bold text-[#4A1722]">
            {errorToken === 'TOKEN_EXPIRADO' ? 'Enlace de Activación Expirado' : 'Enlace no Válido'}
          </h2>

          <p className="text-xs text-[#685D68] mt-2 leading-relaxed">
            {errorToken === 'TOKEN_EXPIRADO'
              ? 'El enlace de activación ha superado el tiempo límite de vigencia de 48 horas.'
              : 'El enlace proporcionado no es válido o ya fue utilizado para activar la cuenta.'}
          </p>

          {/* Formulario para solicitar nuevo enlace si expiró */}
          {errorToken === 'TOKEN_EXPIRADO' && !solicitudEnviada && (
            <form onSubmit={handleSolicitarNuevo} className="mt-6 text-left space-y-3">
              <label className="block text-xs font-bold text-[#292329] uppercase tracking-wider">
                Correo Electrónico Registrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#685D68] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={correoSolicitud}
                  onChange={(e) => setCorreoSolicitud(e.target.value)}
                  placeholder="directivo@ejemplo.com"
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-subtle border border-[#E8E2E4] focus:outline-none focus:border-[#722F37]"
                />
              </div>
              <button
                type="submit"
                disabled={enviandoNuevo}
                className="w-full py-2.5 px-4 rounded-subtle bg-[#722F37] hover:bg-[#4A1722] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${enviandoNuevo ? 'animate-spin' : ''}`} />
                <span>{enviandoNuevo ? 'Enviando...' : 'Solicitar Nuevo Enlace'}</span>
              </button>
            </form>
          )}

          {solicitudEnviada && (
            <div className="mt-5 p-3 rounded-subtle bg-emerald-50 text-emerald-800 text-xs font-semibold">
              ✓ Hemos enviado un nuevo enlace a su correo electrónico. Revise su bandeja de entrada.
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#E8E2E4]">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-bold text-[#722F37] hover:text-[#4A1722] cursor-pointer"
            >
              ← Ir a la pantalla de inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Pantalla principal de Activación de Cuenta
  return (
    <div className="min-h-screen bg-[#F8F5F5] flex flex-col justify-center items-center p-4 selection:bg-[#722F37] selection:text-white">
      <div className="w-full max-w-md">
        {/* Cabecera Institucional */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4A1722] via-[#722F37] to-[#A64D5A] text-white shadow-elevated mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#4A1722] tracking-tight">SICARA</h1>
          <p className="text-[11px] font-bold text-[#722F37] uppercase tracking-wider mt-0.5">
            Activación de Cuenta de Directivo
          </p>
        </div>

        {/* Tarjeta Principal Blanca */}
        <div className="bg-[#FFFFFF] rounded-[24px] shadow-elevated border border-[#E8E2E4] p-6 sm:p-8 animate-fade-in">
          {/* Bienvenida y datos del plantel */}
          <div className="mb-6 p-4 rounded-2xl bg-[#F8F5F5] border border-[#E8E2E4]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#722F37] text-white flex items-center justify-center shrink-0">
                <School className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#722F37] uppercase tracking-wider block">
                  Plantel Incorporado
                </span>
                <p className="text-sm font-bold text-[#292329] truncate">{datosEscuela?.nombre_escuela}</p>
                <p className="text-[11px] text-[#685D68]">CCT: {datosEscuela?.cct}</p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#E8E2E4] text-xs text-[#292329]">
              Bienvenido(a), <strong className="text-[#4A1722]">{datosEscuela?.nombre}</strong>. Establezca su contraseña de acceso institucional para completar la activación de su cuenta.
            </div>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Campo: Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-[#292329] mb-1.5 uppercase tracking-wider">
                Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#685D68]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-9 pr-10 py-2.5 text-xs rounded-subtle border border-[#E8E2E4] focus:outline-none focus:border-[#722F37] transition-all bg-[#FFFFFF] text-[#292329]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#685D68] hover:text-[#722F37] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Indicador de Fortaleza */}
            {fortaleza && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#685D68]">Fortaleza:</span>
                  <span className={fortaleza.color}>{fortaleza.label}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${fortaleza.bg} ${fortaleza.w}`} />
                </div>
              </div>
            )}

            {/* Lista visual interactiva de requisitos */}
            <div className="p-3.5 rounded-xl bg-[#F8F5F5] border border-[#E8E2E4] text-[11px] space-y-1.5">
              <span className="font-bold text-[#4A1722] block mb-1">Requisitos de la contraseña:</span>

              <div className={`flex items-center gap-1.5 ${reqLength ? 'text-emerald-700 font-semibold' : 'text-[#685D68]'}`}>
                {reqLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                <span>Mínimo 8 caracteres</span>
              </div>

              <div className={`flex items-center gap-1.5 ${reqUpper ? 'text-emerald-700 font-semibold' : 'text-[#685D68]'}`}>
                {reqUpper ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                <span>Al menos una letra mayúscula</span>
              </div>

              <div className={`flex items-center gap-1.5 ${reqLower ? 'text-emerald-700 font-semibold' : 'text-[#685D68]'}`}>
                {reqLower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                <span>Al menos una letra minúscula</span>
              </div>

              <div className={`flex items-center gap-1.5 ${reqNumber ? 'text-emerald-700 font-semibold' : 'text-[#685D68]'}`}>
                {reqNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                <span>Al menos un número</span>
              </div>

              <div className={`flex items-center gap-1.5 ${reqSpecial ? 'text-emerald-700 font-semibold' : 'text-[#685D68]'}`}>
                {reqSpecial ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                <span>Al menos un carácter especial (!@#$%^&*)</span>
              </div>
            </div>

            {/* Campo: Confirmar Contraseña */}
            <div>
              <label className="block text-xs font-bold text-[#292329] mb-1.5 uppercase tracking-wider">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#685D68]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmarContrasena}
                  onChange={(e) => setConfirmarContrasena(e.target.value)}
                  placeholder="Repita su contraseña"
                  className={`w-full pl-9 pr-10 py-2.5 text-xs rounded-subtle border ${
                    confirmarContrasena && !contrasenasCoinciden ? 'border-red-400' : 'border-[#E8E2E4]'
                  } focus:outline-none focus:border-[#722F37] transition-all bg-[#FFFFFF] text-[#292329]`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#685D68] hover:text-[#722F37] transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmarContrasena && !contrasenasCoinciden && (
                <p className="text-[11px] text-red-600 mt-1">Las contraseñas no coinciden.</p>
              )}
            </div>

            {/* Botón ACTIVAR CUENTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!esValida || loadingAction}
                className="w-full py-3 px-4 rounded-full bg-[#722F37] hover:bg-[#4A1722] text-white font-bold text-xs uppercase tracking-wider shadow-card hover:shadow-elevated transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {loadingAction ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Activando cuenta...</span>
                  </>
                ) : (
                  <>
                    <span>ACTIVAR CUENTA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Pie de pantalla */}
        <div className="text-center mt-6 text-xs text-[#685D68]">
          SICARA © {new Date().getFullYear()} — Plataforma de Gestión Escolar para Comunidades Rurales
        </div>
      </div>
    </div>
  );
}

