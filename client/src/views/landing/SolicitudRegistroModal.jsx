import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  GraduationCap,
  School,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  ArrowLeft,
  Send,
  Building,
  Loader2,
} from 'lucide-react';

export default function SolicitudRegistroModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const initialFormState = {
    nombre_escuela: '',
    cct: '',
    nivel_educativo: 'Primaria',
    turno: 'Matutino',
    direccion: '',
    colonia: '',
    municipio: '',
    estado: 'Jalisco',
    codigo_postal: '',
    telefono: '',
    correo_institucional: '',
    nombre_responsable: '',
    correo_responsable: '',
    telefono_responsable: '',
    contrasena_responsable: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  // Estados para filtro dinámico de colonias por Código Postal
  const [coloniasList, setColoniasList] = useState([]);
  const [loadingCP, setLoadingCP] = useState(false);
  const [cpErrorMsg, setCpErrorMsg] = useState('');

  // Efecto para consultar colonias al capturar exactamente 5 dígitos de CP
  useEffect(() => {
    const cp = formData.codigo_postal.trim();

    if (cp.length === 5) {
      let isMounted = true;
      setLoadingCP(true);
      setCpErrorMsg('');

      api.getColoniasPorCP(cp)
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.colonias && res.colonias.length > 0) {
            setColoniasList(res.colonias);
            setCpErrorMsg('');
            // Actualizar municipio y estado automáticamente si vienen del catálogo
            setFormData((prev) => ({
              ...prev,
              municipio: res.municipio || prev.municipio,
              estado: res.estado || prev.estado,
              // Mantener colonia si sigue existiendo en la nueva lista, si no, limpiar
              colonia: res.colonias.includes(prev.colonia) ? prev.colonia : '',
            }));
          } else {
            setColoniasList([]);
            setCpErrorMsg('No se encontraron colonias para este código postal');
            setFormData((prev) => ({ ...prev, colonia: '' }));
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setColoniasList([]);
          setCpErrorMsg(err.message || 'Error al consultar colonias del código postal');
          setFormData((prev) => ({ ...prev, colonia: '' }));
        })
        .finally(() => {
          if (isMounted) setLoadingCP(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      // Si el código postal está incompleto o cambia, limpiar selección anterior
      setColoniasList([]);
      setLoadingCP(false);
      setCpErrorMsg('');
      if (formData.colonia) {
        setFormData((prev) => ({ ...prev, colonia: '' }));
      }
    }
  }, [formData.codigo_postal]);

  const validate = () => {
    const errs = {};
    if (!formData.nombre_escuela.trim()) errs.nombre_escuela = 'El nombre de la escuela es obligatorio.';
    if (!formData.cct.trim()) {
      errs.cct = 'La Clave CCT es obligatoria.';
    } else if (formData.cct.trim().length < 8) {
      errs.cct = 'La clave CCT debe tener entre 8 y 10 caracteres.';
    }

    if (!formData.nombre_responsable.trim()) {
      errs.nombre_responsable = 'El nombre del responsable es obligatorio.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.correo_responsable.trim()) {
      errs.correo_responsable = 'El correo electrónico del responsable es obligatorio.';
    } else if (!emailRegex.test(formData.correo_responsable.trim().toLowerCase())) {
      errs.correo_responsable = 'Ingrese un formato de correo electrónico válido.';
    }

    if (formData.correo_institucional.trim() && !emailRegex.test(formData.correo_institucional.trim().toLowerCase())) {
      errs.correo_institucional = 'Formato de correo institucional inválido.';
    }

    if (formData.telefono.trim() && formData.telefono.trim().length !== 10) {
      errs.telefono = 'El teléfono institucional debe tener exactamente 10 dígitos.';
    }

    if (formData.telefono_responsable.trim() && formData.telefono_responsable.trim().length !== 10) {
      errs.telefono_responsable = 'El teléfono celular debe tener exactamente 10 dígitos.';
    }

    if (formData.codigo_postal.trim() && formData.codigo_postal.trim().length !== 5) {
      errs.codigo_postal = 'El código postal debe tener 5 dígitos.';
    }

    if (formData.contrasena_responsable && formData.contrasena_responsable.length < 6) {
      errs.contrasena_responsable = 'La contraseña inicial sugerida debe tener al menos 6 caracteres.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Por favor revise los campos requeridos marcados en rojo.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        cct: formData.cct.toUpperCase().trim(),
        correo_responsable: formData.correo_responsable.toLowerCase().trim(),
        correo_institucional: formData.correo_institucional.toLowerCase().trim(),
      };

      const res = await api.createSolicitud(payload);
      if (res.success) {
        setSuccessData(res.solicitud || {
          nombre_escuela: formData.nombre_escuela,
          correo_responsable: formData.correo_responsable,
        });
        showToast('Solicitud enviada exitosamente para revisión.', 'success');
        setFormData(initialFormState);
        setErrors({});
      }
    } catch (err) {
      const msg = err.message || 'Error al enviar la solicitud.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setSuccessData(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Solicitud de Registro Institucional"
      subtitle="Complete los datos de su plantel escolar para solicitar acceso a la plataforma SICARA"
      maxWidth="max-w-3xl"
      footer={
        successData ? (
          <button
            type="button"
            onClick={handleModalClose}
            className="px-5 py-2.5 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            Entendido, volver al inicio
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleModalClose}
              disabled={loading}
              className="px-4 py-2 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-solicitar-escuela"
              disabled={loading}
              className="px-5 py-2 rounded-subtle bg-vino-primary hover:bg-vino-hover text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Enviando solicitud...' : 'Enviar Solicitud'}</span>
            </button>
          </>
        )
      }
    >
      {successData ? (
        <div className="py-6 px-2 text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-app-text">
            ¡Solicitud enviada correctamente!
          </h3>
          <p className="text-xs text-app-muted max-w-md mx-auto leading-relaxed">
            La solicitud para la escuela <strong className="text-app-text">{successData.nombre_escuela}</strong> ha sido recibida por el Administrador General de SICARA.
          </p>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-card text-left max-w-lg mx-auto text-xs space-y-2">
            <p className="font-bold text-amber-900">¿Qué sucederá después?</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              1. El Administrador General revisará la clave CCT y datos institucionales del plantel.<br />
              2. Una vez aprobada, se activará la cuenta directiva asociada a <strong className="font-semibold">{formData.correo_responsable || successData.correo_responsable}</strong>.<br />
              3. Recibirá notificación con las instrucciones de acceso directo al sistema.
            </p>
          </div>
        </div>
      ) : (
        <form id="form-solicitar-escuela" onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {/* Bloque 1: Datos de la Escuela */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-vino-dark uppercase tracking-wider pb-1 border-b border-app-border">
              <Building className="w-4 h-4 text-vino-primary" />
              <span>Datos del Plantel Educativo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Nombre de la Escuela <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.nombre_escuela}
                  onChange={(e) => {
                    setFormData({ ...formData, nombre_escuela: e.target.value });
                    if (errors.nombre_escuela) setErrors({ ...errors, nombre_escuela: '' });
                  }}
                  placeholder="Ej. Primaria Rural Miguel Hidalgo y Costilla"
                  className={`w-full px-3 py-2 rounded-subtle border ${
                    errors.nombre_escuela ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
                {errors.nombre_escuela && (
                  <p className="text-[11px] text-status-error mt-1">{errors.nombre_escuela}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Clave CCT (Centro de Trabajo) <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.cct}
                  onChange={(e) => {
                    setFormData({ ...formData, cct: e.target.value.toUpperCase() });
                    if (errors.cct) setErrors({ ...errors, cct: '' });
                  }}
                  placeholder="Ej. 14DPR1234K"
                  className={`w-full px-3 py-2 rounded-subtle border ${
                    errors.cct ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary font-mono text-xs uppercase`}
                />
                {errors.cct && (
                  <p className="text-[11px] text-status-error mt-1">{errors.cct}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Nivel Educativo
                </label>
                <select
                  value={formData.nivel_educativo}
                  onChange={(e) => setFormData({ ...formData, nivel_educativo: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white"
                >
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Preparatoria">Preparatoria</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Turno
                </label>
                <select
                  value={formData.turno}
                  onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-white"
                >
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Completo">Tiempo Completo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Código Postal (5 dígitos)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={5}
                    value={formData.codigo_postal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, codigo_postal: val });
                      if (errors.codigo_postal) setErrors({ ...errors, codigo_postal: '' });
                    }}
                    placeholder="Ej. 49340"
                    className={`w-full px-3 py-2 rounded-subtle border ${
                      errors.codigo_postal || cpErrorMsg ? 'border-status-error' : 'border-app-border'
                    } focus:outline-none focus:border-vino-primary text-xs ${
                      loadingCP ? 'pr-8' : ''
                    }`}
                  />
                  {loadingCP && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-vino-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>
                {errors.codigo_postal && (
                  <p className="text-[11px] text-status-error mt-1">{errors.codigo_postal}</p>
                )}
                {cpErrorMsg && (
                  <p className="text-[11px] text-status-error mt-1 font-semibold">{cpErrorMsg}</p>
                )}
                {formData.codigo_postal.length > 0 && formData.codigo_postal.length < 5 && (
                  <p className="text-[10px] text-app-subtext mt-1">Ingrese los 5 dígitos numéricos</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Colonia / Asentamiento
                </label>
                <div className="relative">
                  <select
                    value={formData.colonia}
                    disabled={loadingCP || coloniasList.length === 0}
                    onChange={(e) => {
                      setFormData({ ...formData, colonia: e.target.value });
                      if (errors.colonia) setErrors({ ...errors, colonia: '' });
                    }}
                    className={`w-full px-3 py-2 rounded-subtle border ${
                      errors.colonia ? 'border-status-error' : 'border-app-border'
                    } focus:outline-none focus:border-vino-primary text-xs bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  >
                    {coloniasList.length === 0 ? (
                      <option value="">
                        {loadingCP
                          ? 'Consultando colonias...'
                          : formData.codigo_postal.length === 5
                          ? 'No hay colonias disponibles'
                          : 'Capture el Código Postal primero'}
                      </option>
                    ) : (
                      <>
                        <option value="">Seleccione una colonia...</option>
                        {coloniasList.map((col, idx) => (
                          <option key={`${col}-${idx}`} value={col}>
                            {col}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                {errors.colonia && (
                  <p className="text-[11px] text-status-error mt-1">{errors.colonia}</p>
                )}
                {coloniasList.length > 0 && (
                  <p className="text-[10px] text-emerald-700 mt-1">
                    {coloniasList.length} {coloniasList.length === 1 ? 'colonia encontrada' : 'colonias encontradas'}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Municipio
                </label>
                <input
                  type="text"
                  value={formData.municipio}
                  onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                  placeholder="Ej. Tapalpa"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  placeholder="Ej. Jalisco"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs bg-gray-50/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Dirección (Calle, Número, Localidad Rural)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Ej. Domicilio Conocido S/N, Ejido Las Canoas"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Teléfono Institucional (10 dígitos)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.telefono}
                  onChange={(e) => {
                    setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, '') });
                    if (errors.telefono) setErrors({ ...errors, telefono: '' });
                  }}
                  placeholder="Ej. 3434251122"
                  className={`w-full px-3 py-2 rounded-subtle border ${
                    errors.telefono ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
                {errors.telefono && (
                  <p className="text-[11px] text-status-error mt-1">{errors.telefono}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bloque 2: Datos del Director o Responsable */}
          <div className="space-y-3 pt-3 border-t border-app-border">
            <div className="flex items-center gap-2 text-xs font-bold text-vino-dark uppercase tracking-wider pb-1 border-b border-app-border">
              <User className="w-4 h-4 text-vino-primary" />
              <span>Datos del Director o Docente Responsable</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Nombre del Responsable <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.nombre_responsable}
                  onChange={(e) => {
                    setFormData({ ...formData, nombre_responsable: e.target.value });
                    if (errors.nombre_responsable) setErrors({ ...errors, nombre_responsable: '' });
                  }}
                  placeholder="Ej. Profr. Juan Manuel Ortiz"
                  className={`w-full px-3 py-2 rounded-subtle border ${
                    errors.nombre_responsable ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
                {errors.nombre_responsable && (
                  <p className="text-[11px] text-status-error mt-1">{errors.nombre_responsable}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Correo Electrónico (para inicio de sesión) <span className="text-status-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.correo_responsable}
                  onChange={(e) => {
                    setFormData({ ...formData, correo_responsable: e.target.value });
                    if (errors.correo_responsable) setErrors({ ...errors, correo_responsable: '' });
                  }}
                  placeholder="director.contacto@gmail.com"
                  className={`w-full px-3 py-2 rounded-subtle border ${
                    errors.correo_responsable ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
                {errors.correo_responsable && (
                  <p className="text-[11px] text-status-error mt-1">{errors.correo_responsable}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Teléfono Celular Personal (10 dígitos)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.telefono_responsable}
                  onChange={(e) => {
                    setFormData({ ...formData, telefono_responsable: e.target.value.replace(/\D/g, '') });
                    if (errors.telefono_responsable) setErrors({ ...errors, telefono_responsable: '' });
                  }}
                  placeholder="Ej. 3431029384"
                  className={`w-full px-3 py-2 rounded-subtle border ${
                    errors.telefono_responsable ? 'border-status-error' : 'border-app-border'
                  } focus:outline-none focus:border-vino-primary text-xs`}
                />
                {errors.telefono_responsable && (
                  <p className="text-[11px] text-status-error mt-1">{errors.telefono_responsable}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                  Contraseña Inicial Sugerida (opcional)
                </label>
                <input
                  type="password"
                  maxLength={72}
                  value={formData.contrasena_responsable}
                  onChange={(e) => {
                    setFormData({ ...formData, contrasena_responsable: e.target.value });
                    if (errors.contrasena_responsable) setErrors({ ...errors, contrasena_responsable: '' });
                  }}
                  placeholder="Mínimo 6 caracteres (o se asignará una segura)"
                  className="w-full px-3 py-2 rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary text-xs"
                />
                {errors.contrasena_responsable && (
                  <p className="text-[11px] text-status-error mt-1">{errors.contrasena_responsable}</p>
                )}
              </div>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

