import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  GraduationCap,
  KeyRound,
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
  ArrowLeft,
} from 'lucide-react';

export default function RecuperarPasswordView({ token, initialEmail = '', onCancel, onGoToLogin }) {
  const { setSession } = useAuth();
  const { showToast } = useToast();

  const isWithToken = Boolean(token && token !== 'solicitar' && token !== 'true');

  // Estados cuando se tiene token
  const [verificando, setVerificando] = useState(isWithToken);
  const [errorToken, setErrorToken] = useState(null); // 'TOKEN_INVALIDO', 'TOKEN_EXPIRADO'
  const [datosUsuario, setDatosUsuario] = useState(null);

  // Campos para nueva contraseña (cuando se tiene token)
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [exitoRestablecimiento, setExitoRestablecimiento] = useState(false);

  // Estados para solicitar enlace (cuando no se tiene token)
  const [correo, setCorreo] = useState(initialEmail || '');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');

  // 1. Si viene con token, verificar validez al montar
  useEffect(() => {
    let isMounted = true;
    if (!isWithToken) {
      setVerificando(false);
      return;
    }

    api.verificarTokenRecuperacion(token)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setDatosUsuario(res.data);
          setErrorToken(null);
        } else {
          setErrorToken('TOKEN_INVALIDO');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err.data && err.data.code === 'TOKEN_EXPIRADO') {
          setErrorToken('TOKEN_EXPIRADO');
          if (err.data.correo) setCorreo(err.data.correo);
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
  }, [token, isWithToken]);

  // 2. Requisitos de seguridad individuales
  const reqLength = contrasena.length >= 8;
  const reqUpper = /[A-Z]/.test(contrasena);
  const reqLower = /[a-z]/.test(contrasena);
  const reqNumber = /\d/.test(contrasena);
  const reqSpecial = /[^a-zA-Z\d\s]/.test(contrasena);
  const passwordsMatch = contrasena.length > 0 && contrasena === confirmarContrasena;

  // Fortaleza calculada
  const { strengthScore, strengthLabel, strengthColor, isComplete } = useMemo(() => {
    const passed = [reqLength, reqUpper, reqLower, reqNumber, reqSpecial].filter(Boolean).length;
    let label = 'Débil';
    let color = 'bg-status-error';

    if (passed >= 5) {
      label = 'Fuerte';
      color = 'bg-status-success';
    } else if (passed >= 3) {
      label = 'Media';
      color = 'bg-status-warning';
    }

    return {
      strengthScore: (passed / 5) * 100,
      strengthLabel: label,
      strengthColor: color,
      isComplete: passed === 5 && passwordsMatch,
    };
  }, [reqLength, reqUpper, reqLower, reqNumber, reqSpecial, passwordsMatch]);

  // Manejar envío de solicitud de enlace
  const handleSolicitarEnlace = async (e) => {
    e.preventDefault();
    if (!correo || !correo.trim()) {
      showToast('Por favor ingrese su correo electrónico.', 'warning');
      return;
    }

    setEnviandoSolicitud(true);
    try {
      const res = await api.solicitarRecuperacionPassword(correo.trim());
      setSolicitudEnviada(true);
      setMensajeSolicitud(res.message || 'Se ha enviado un enlace seguro a su correo electrónico.');
      showToast('Solicitud enviada correctamente. Revise su correo.', 'success');
    } catch (err) {
      showToast(err.message || 'Error al enviar la solicitud de recuperación.', 'error');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // Manejar guardado de nueva contraseña con token
  const handleGuardarNuevaPassword = async (e) => {
    e.preventDefault();
    if (!isComplete || loadingAction) return;

    setLoadingAction(true);
    try {
      const res = await api.completarRecuperacionPassword({
        token,
        contrasena,
        confirmarContrasena,
      });

      if (res.success) {
        setExitoRestablecimiento(true);
        showToast('¡Contraseña restablecida con éxito!', 'success');

        // Si el backend devolvió sesión automática, conectarlo tras 1.8 segundos
        if (res.token && res.user && setSession) {
          setTimeout(() => {
            setSession(res.token, res.user);
          }, 1800);
        } else if (onGoToLogin) {
          setTimeout(() => {
            onGoToLogin();
          }, 2000);
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al restablecer la contraseña.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // PANTALLA: Verificando token
  if (verificando) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-card shadow-elevated border border-app-border text-center max-w-sm w-full space-y-4 animate-fade-in">
          <RefreshCw className="w-10 h-10 animate-spin text-vino-primary mx-auto" />
          <h2 className="text-base font-bold text-app-text">Validando enlace de seguridad...</h2>
          <p className="text-xs text-app-muted">Por favor espere mientras verificamos su enlace de restablecimiento.</p>
        </div>
      </div>
    );
  }

  // PANTALLA: Token inválido o expirado
  if (isWithToken && errorToken) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-card shadow-elevated border border-app-border p-8 animate-fade-in text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-red-50 text-status-error flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-app-text">
              {errorToken === 'TOKEN_EXPIRADO' ? 'Enlace de restablecimiento expirado' : 'Enlace no válido'}
            </h2>
            <p className="text-xs text-app-muted mt-1 leading-relaxed">
              {errorToken === 'TOKEN_EXPIRADO'
                ? 'Por su seguridad, los enlaces para restablecer contraseña expiran en 2 horas. Puede solicitar un nuevo enlace a continuación.'
                : 'Este enlace de restablecimiento ya fue utilizado o no es válido. Ingrese su correo para generar uno nuevo.'}
            </p>
          </div>

          <form onSubmit={handleSolicitarEnlace} className="space-y-3 pt-2 text-left">
            <div>
              <label className="block text-[11px] font-bold text-app-text mb-1 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={enviandoSolicitud}
              className="w-full py-2.5 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {enviandoSolicitud ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando enlace...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Solicitar nuevo enlace</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-app-border">
            <button
              type="button"
              onClick={onCancel || onGoToLogin}
              className="text-xs font-semibold text-app-muted hover:text-vino-primary transition-colors cursor-pointer"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA: Solicitar enlace (sin token o flujo general de recuperación)
  if (!isWithToken) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col justify-center items-center p-4 selection:bg-vino-soft selection:text-vino-dark">
        {/* Ambient accent */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-vino/10 via-vino/5 to-transparent pointer-events-none -z-10" />

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-vino-dark via-vino to-vino-light text-white shadow-elevated mb-3 border border-white/40">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-vino-dark">
              SICARA
            </h1>
            <p className="text-xs font-semibold text-vino-primary uppercase tracking-widest mt-0.5">
              Restablecimiento de Contraseña
            </p>
          </div>

          <div className="bg-white rounded-card shadow-elevated border border-app-border p-7 animate-fade-in">
            {solicitudEnviada ? (
              <div className="text-center space-y-4 py-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-app-text">¡Enlace enviado correctamente!</h2>
                <p className="text-xs text-app-muted leading-relaxed">
                  {mensajeSolicitud || 'Hemos enviado un enlace seguro a tu correo electrónico para que puedas crear tu nueva contraseña.'}
                </p>
                <div className="p-3.5 rounded-subtle bg-amber-50 border border-amber-200 text-amber-900 text-left text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Importante:</span>
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    El enlace recibido tiene una vigencia de <strong>2 horas</strong>. Si no lo encuentras en tu bandeja de entrada principal, te recomendamos revisar la carpeta de spam o correo no deseado.
                  </p>
                </div>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={onGoToLogin || onCancel}
                    className="w-full py-2.5 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Ir a Iniciar Sesión
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-app-text">¿Olvidaste tu contraseña?</h2>
                  <p className="text-xs text-app-muted mt-1 leading-relaxed">
                    Ingresa el correo electrónico asociado a tu cuenta de SICARA y te enviaremos un enlace seguro para que puedas establecer una nueva contraseña.
                  </p>
                </div>

                <form onSubmit={handleSolicitarEnlace} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-app-text mb-1 uppercase tracking-wider">
                      Correo Electrónico <span className="text-status-error">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={enviandoSolicitud}
                    style={{ backgroundColor: '#A64D5A' }}
                    className="w-full py-3 rounded-subtle hover:opacity-95 text-white font-bold text-xs shadow-card hover:shadow-elevated transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {enviandoSolicitud ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando enlace seguro...</span>
                      </>
                    ) : (
                      <>
                        <span>RESTABLECER MI CONTRASEÑA</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-app-border text-center">
                  <button
                    type="button"
                    onClick={onCancel || onGoToLogin}
                    className="text-xs font-semibold text-app-muted hover:text-vino-primary transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver al inicio / Iniciar sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA: Formulario con Token para Crear Nueva Contraseña
  return (
    <div className="min-h-screen bg-app-bg flex flex-col justify-center items-center p-4 selection:bg-vino-soft selection:text-vino-dark">
      {/* Background ambient accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-vino/10 via-vino/5 to-transparent pointer-events-none -z-10" />

      <div className="w-full max-w-lg">
        {/* Header institucional */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-vino-dark via-vino to-vino-light text-white shadow-elevated mb-3 border border-white/40">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-vino-dark">
            SICARA
          </h1>
          <p className="text-xs font-semibold text-vino-primary uppercase tracking-widest mt-0.5">
            Plataforma para Escuelas Rurales
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-card shadow-elevated border border-app-border p-6 sm:p-8 animate-fade-in">
          {exitoRestablecimiento ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-app-text">
                ¡Contraseña restablecida exitosamente!
              </h2>
              <p className="text-xs text-app-muted max-w-md mx-auto leading-relaxed">
                Tu nueva contraseña ha sido guardada con cifrado seguro en la plataforma.
              </p>
              <div className="p-3 bg-vino-soft/50 border border-vino-border rounded-subtle text-xs text-vino-dark font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-vino-primary" />
                <span>Iniciando sesión automáticamente en tu panel...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Saludo y Escuela */}
              <div className="mb-6 pb-4 border-b border-app-border">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 mb-2">
                  Seguridad de Acceso
                </span>
                <h2 className="text-xl font-bold text-app-text leading-snug">
                  Establecer Nueva Contraseña
                </h2>
                <p className="text-xs text-app-muted mt-1">
                  Hola <strong className="text-app-text">{datosUsuario?.nombre || 'Directivo(a)'}</strong>.
                  {datosUsuario?.nombre_escuela && (
                    <> Para tu cuenta asociada a <strong className="text-vino-dark">{datosUsuario.nombre_escuela}</strong>.</>
                  )}
                </p>
              </div>

              <form onSubmit={handleGuardarNuevaPassword} className="space-y-4 text-xs">
                {/* Campo: Nueva Contraseña */}
                <div>
                  <label className="block text-[11px] font-bold text-app-text mb-1 uppercase tracking-wider">
                    Nueva Contraseña <span className="text-status-error">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      placeholder="Escribe tu nueva contraseña"
                      className="w-full pl-9 pr-10 py-2.5 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-muted hover:text-vino-primary cursor-pointer"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Barra de fortaleza de contraseña */}
                {contrasena.length > 0 && (
                  <div className="space-y-1 animate-fade-in">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-app-muted">Fortaleza:</span>
                      <span className={`font-bold ${
                        strengthLabel === 'Fuerte' ? 'text-status-success' :
                        strengthLabel === 'Media' ? 'text-status-warning' : 'text-status-error'
                      }`}>
                        {strengthLabel}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthColor} transition-all duration-300`}
                        style={{ width: `${strengthScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Campo: Confirmar Contraseña */}
                <div>
                  <label className="block text-[11px] font-bold text-app-text mb-1 uppercase tracking-wider">
                    Confirmar Contraseña <span className="text-status-error">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-app-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmarContrasena}
                      onChange={(e) => setConfirmarContrasena(e.target.value)}
                      placeholder="Repite la contraseña para confirmar"
                      className={`w-full pl-9 pr-10 py-2.5 rounded-subtle border ${
                        confirmarContrasena && !passwordsMatch ? 'border-status-error' : 'border-app-border'
                      } focus:outline-none focus:border-vino-primary text-xs bg-white`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-muted hover:text-vino-primary cursor-pointer"
                      title={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmarContrasena && !passwordsMatch && (
                    <p className="text-[11px] text-status-error mt-1">Las contraseñas no coinciden.</p>
                  )}
                </div>

                {/* Checklist interactivo de requisitos */}
                <div className="p-3.5 rounded-card bg-[#FDFBFB] border border-app-border space-y-2 text-[11px]">
                  <p className="font-bold text-app-text uppercase tracking-wider text-[10px]">
                    Requisitos mínimos de seguridad:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 ${reqLength ? 'text-status-success font-semibold' : 'text-app-muted'}`}>
                      {reqLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 opacity-40" />}
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${reqUpper ? 'text-status-success font-semibold' : 'text-app-muted'}`}>
                      {reqUpper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 opacity-40" />}
                      <span>Al menos una mayúscula (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${reqLower ? 'text-status-success font-semibold' : 'text-app-muted'}`}>
                      {reqLower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 opacity-40" />}
                      <span>Al menos una minúscula (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${reqNumber ? 'text-status-success font-semibold' : 'text-app-muted'}`}>
                      {reqNumber ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 opacity-40" />}
                      <span>Al menos un número (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${reqSpecial ? 'text-status-success font-semibold' : 'text-app-muted'}`}>
                      {reqSpecial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 opacity-40" />}
                      <span>Un carácter especial (@$!%*?&#)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-status-success font-semibold' : 'text-app-muted'}`}>
                      {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 opacity-40" />}
                      <span>Contraseñas coinciden</span>
                    </div>
                  </div>
                </div>

                {/* Botón de acción */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!isComplete || loadingAction}
                    style={{ backgroundColor: isComplete ? '#A64D5A' : undefined }}
                    className={`w-full py-3 rounded-subtle text-white font-bold text-xs uppercase tracking-wider shadow-card hover:shadow-elevated transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isComplete ? 'hover:opacity-95' : 'bg-gray-300 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {loadingAction ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando nueva contraseña...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>RESTABLECER MI CONTRASEÑA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-3 border-t border-app-border text-center">
                <button
                  type="button"
                  onClick={onCancel || onGoToLogin}
                  className="text-xs text-app-muted hover:text-vino-primary font-semibold transition-colors cursor-pointer"
                >
                  ← Volver al inicio / Iniciar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

