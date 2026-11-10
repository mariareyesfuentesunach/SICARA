import React, { useState, useEffect } from 'react';
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
  UserCheck,
  Building,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';

export default function VerificarDocenteView({ initialCurp = '', initialEmail = '', onCancel, onGoToLogin }) {
  const { setSession } = useAuth();
  const { showToast } = useToast();

  // Paso 1: 'verificar' (captura y validación de CURP)
  // Paso 2: 'contrasena' (definición de contraseña segura)
  // Paso 3: 'exito' (confirmación final)
  const [paso, setPaso] = useState('verificar');

  // Campos de búsqueda / validación
  const [curp, setCurp] = useState(initialCurp || '');
  const [correo, setCorreo] = useState(initialEmail || '');
  const [loadingVerif, setLoadingVerif] = useState(false);
  const [docenteEncontrado, setDocenteEncontrado] = useState(null);
  const [errorVerif, setErrorVerif] = useState('');

  // Campos de contraseña
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [errorPass, setErrorPass] = useState('');

  const handleVerificarCurp = async (curpVal, correoVal) => {
    const c = (curpVal !== undefined ? curpVal : curp).trim().toUpperCase();
    const e = (correoVal !== undefined ? correoVal : correo).trim().toLowerCase();

    if (!c) {
      setErrorVerif('Por favor ingrese su CURP completa (18 caracteres).');
      return;
    }

    if (!e) {
      setErrorVerif('Por favor ingrese el correo electrónico con el que fue registrado por su escuela.');
      return;
    }

    setLoadingVerif(true);
    setErrorVerif('');

    try {
      const res = await api.verificarCurpDocente(c, e);
      if (res.success && res.docente) {
        setDocenteEncontrado(res.docente);
        setPaso('contrasena');
        showToast('Docente verificado exitosamente. Ahora puede crear su contraseña.', 'success');
      } else {
        setErrorVerif(res.message || 'No se encontró registro con los datos ingresados.');
      }
    } catch (err) {
      setErrorVerif(err.message || 'No se pudo verificar el registro. Asegúrese de que su escuela ya lo haya dado de alta.');
    } finally {
      setLoadingVerif(false);
    }
  };

  // Requisitos dinámicos de seguridad de contraseña
  const passwordCriteria = {
    length: contrasena.length >= 8,
    upper: /[A-Z]/.test(contrasena),
    lower: /[a-z]/.test(contrasena),
    number: /\d/.test(contrasena),
    special: /[^a-zA-Z\d\s]/.test(contrasena),
    match: contrasena.length > 0 && contrasena === confirmarContrasena,
  };

  const isPasswordSecure =
    passwordCriteria.length &&
    passwordCriteria.upper &&
    passwordCriteria.lower &&
    passwordCriteria.number &&
    passwordCriteria.special &&
    passwordCriteria.match;

  const handleGuardarContrasena = async (e) => {
    e.preventDefault();
    setErrorPass('');

    if (!isPasswordSecure) {
      setErrorPass('La contraseña no cumple con todos los requisitos de seguridad o no coinciden.');
      return;
    }

    setLoadingPass(true);
    try {
      const res = await api.establecerPasswordDocente({
        id_usuario: docenteEncontrado.id_usuario,
        curp: docenteEncontrado.curp,
        contrasena,
        confirmarContrasena,
      });

      if (res.success && res.token && res.user) {
        showToast(res.message, 'success');
        setPaso('exito');
        // Iniciar sesión automáticamente
        setTimeout(() => {
          setSession(res.token, res.user);
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 1800);
      }
    } catch (err) {
      setErrorPass(err.message || 'Ocurrió un error al guardar la contraseña.');
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F5] flex flex-col justify-between selection:bg-[#722F37] selection:text-white font-sans antialiased p-4 sm:p-6 md:p-8">
      {/* Botón superior de volver */}
      <div className="max-w-xl mx-auto w-full mb-4">
        <button
          onClick={onCancel || onGoToLogin}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-app-text hover:text-vino-primary shadow-xs border border-app-border text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio de sesión</span>
        </button>
      </div>

      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white rounded-2xl shadow-elevated border border-app-border overflow-hidden">
          {/* Header Institucional */}
          <div className="bg-gradient-to-r from-[#4A1722] via-[#722F37] to-[#A64D5A] p-6 text-white text-center relative">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 shadow-inner">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">SICARA</h1>
            <p className="text-xs text-white/80 uppercase tracking-widest mt-0.5">
              Acceso Institucional de Docentes
            </p>
            <div className="inline-block mt-3 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold border border-white/25">
              {paso === 'verificar'
                ? 'Paso 1: Verificación de Alta por CURP'
                : paso === 'contrasena'
                ? 'Paso 2: Creación de Contraseña Personal'
                : 'Paso 3: Cuenta Verificada'}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* PASO 1: VERIFICAR CURP */}
            {paso === 'verificar' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerificarCurp();
                }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-base font-bold text-app-text flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-vino-primary" />
                    Verifique su alta como docente
                  </h2>
                  <p className="text-xs text-app-muted mt-1 leading-relaxed">
                    Para resguardar su identidad, ingrese su <strong>Correo electrónico</strong> y su <strong>CURP</strong> registrados por la dirección de su plantel escolar. Ambos datos deben coincidir exactamente con el alta del sistema.
                  </p>
                </div>

                {errorVerif && (
                  <div className="p-3.5 rounded-xl bg-status-error-bg border border-red-200 text-status-error text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Aviso de verificación:</strong>
                      <p className="mt-0.5 text-[11px] leading-relaxed">{errorVerif}</p>
                      {errorVerif.includes('ya ha sido activada') && (
                        <button
                          type="button"
                          onClick={onGoToLogin || onCancel}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-800 text-[11px] font-bold hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <span>Ir al Inicio de Sesión</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                      Correo Electrónico Registrado <span className="text-status-error">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="docente@escuela.edu.mx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                      CURP del Docente (18 caracteres) <span className="text-status-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={18}
                      value={curp}
                      onChange={(e) => setCurp(e.target.value.toUpperCase())}
                      placeholder="Ej. CURP850101MDFRRN01"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-app-border focus:outline-none focus:border-vino-primary font-mono text-sm tracking-widest uppercase bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loadingVerif || !curp.trim() || !correo.trim()}
                    className="w-full py-3 rounded-xl bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loadingVerif ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verificando alta en el sistema...</span>
                      </>
                    ) : (
                      <>
                        <span>Verificar si estoy dado(a) de alta</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* PASO 2: CREACIÓN DE CONTRASEÑA */}
            {paso === 'contrasena' && docenteEncontrado && (
              <form onSubmit={handleGuardarContrasena} className="space-y-5 animate-fade-in">
                {/* Tarjeta de Confirmación de Identidad */}
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-green-800">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <span>¡Alta confirmada en el sistema!</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-green-700 block">Docente:</span>
                      <strong className="font-semibold text-green-950">
                        {docenteEncontrado.nombre} {docenteEncontrado.apellidos}
                      </strong>
                    </div>
                    <div>
                      <span className="text-green-700 block">Plantel Educativo:</span>
                      <strong className="font-semibold text-green-950">
                        {docenteEncontrado.escuela?.nombre_escuela || 'Plantel Escolar'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-green-700 block">CURP Validada:</span>
                      <strong className="font-mono text-green-950">{docenteEncontrado.curp}</strong>
                    </div>
                    <div>
                      <span className="text-green-700 block">Correo de Acceso:</span>
                      <strong className="font-mono text-green-950">{docenteEncontrado.correo}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-vino-primary" />
                    Defina su contraseña personal de acceso
                  </h3>
                  <p className="text-xs text-app-muted mt-0.5">
                    Por su privacidad y seguridad, solo usted debe conocer esta contraseña.
                  </p>
                </div>

                {errorPass && (
                  <div className="p-3 rounded-xl bg-status-error-bg border border-red-200 text-status-error text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorPass}</span>
                  </div>
                )}

                <div className="space-y-4 text-xs">
                  {/* Campo Nueva Contraseña */}
                  <div>
                    <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
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
                        placeholder="Mínimo 8 caracteres"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-muted hover:text-vino-primary cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Campo Confirmar Contraseña */}
                  <div>
                    <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
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
                        placeholder="Repita exactamente la contraseña"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-muted hover:text-vino-primary cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Lista visual de requisitos */}
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-app-border space-y-1.5 text-[11px]">
                    <span className="font-bold text-app-text block text-[11px] mb-1">
                      Requisitos de seguridad obligatorios:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-green-700 font-bold' : 'text-app-muted'}`}>
                        {passwordCriteria.length ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                        Mínimo 8 caracteres
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.upper ? 'text-green-700 font-bold' : 'text-app-muted'}`}>
                        {passwordCriteria.upper ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                        Al menos 1 mayúscula
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.lower ? 'text-green-700 font-bold' : 'text-app-muted'}`}>
                        {passwordCriteria.lower ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                        Al menos 1 minúscula
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.number ? 'text-green-700 font-bold' : 'text-app-muted'}`}>
                        {passwordCriteria.number ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                        Al menos 1 número
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.special ? 'text-green-700 font-bold' : 'text-app-muted'}`}>
                        {passwordCriteria.special ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                        Carácter especial (!@#$...)
                      </span>
                      <span className={`flex items-center gap-1.5 ${passwordCriteria.match ? 'text-green-700 font-bold' : 'text-app-muted'}`}>
                        {passwordCriteria.match ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                        Contraseñas coinciden
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPaso('verificar')}
                    className="px-4 py-2.5 rounded-xl border border-app-border text-app-text hover:bg-gray-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    Volver a verificar CURP
                  </button>
                  <button
                    type="submit"
                    disabled={loadingPass || !isPasswordSecure}
                    className="flex-1 py-3 rounded-xl bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loadingPass ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando contraseña...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Guardar contraseña y entrar al panel</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* PASO 3: ÉXITO */}
            {paso === 'exito' && (
              <div className="text-center py-6 space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-soft">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-lg font-bold text-app-text">
                  ¡Contraseña creada exitosamente!
                </h2>
                <p className="text-xs text-app-muted max-w-sm mx-auto leading-relaxed">
                  Su cuenta de docente ha quedado activada. En breve será redirigido(a) automáticamente a su panel en <strong>SICARA</strong>.
                </p>
                <div className="pt-2">
                  <RefreshCw className="w-5 h-5 text-vino-primary animate-spin mx-auto" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-app-muted py-4">
        SICARA • Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales
      </footer>
    </div>
  );
}

