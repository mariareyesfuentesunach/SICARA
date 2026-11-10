import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Settings,
  Upload,
  Save,
  Palette,
  School,
  RefreshCw,
  Check,
  Eye,
} from 'lucide-react';

export default function DirectivoConfiguracionView({ escuela, onEscuelaUpdated }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados del formulario
  const [nombreEscuela, setNombreEscuela] = useState('');
  const [colorPrimario, setColorPrimario] = useState('#722F37');
  const [colorSecundario, setColorSecundario] = useState('#4A1722');
  const [colorComplementario, setColorComplementario] = useState('#A64D5A');

  // Logotipo
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [tipoLogo, setTipoLogo] = useState('image/png');
  const [eliminarLogo, setEliminarLogo] = useState(false);

  // Datos fijos institucionales
  const [infoFija, setInfoFija] = useState(null);

  const fetchConfiguracion = async () => {
    setLoading(true);
    try {
      const res = await api.getDirectivoConfiguracion();
      if (res.success && res.escuela) {
        const e = res.escuela;
        setNombreEscuela(e.nombre_escuela || '');
        setColorPrimario(e.color_primario || '#722F37');
        setColorSecundario(e.color_secundario || '#4A1722');
        setColorComplementario(e.color_complementario || '#A64D5A');
        setInfoFija(e);

        if (e.tiene_logo) {
          setLogoPreview(`/api/directivo/logo?escuela=${e.id_escuela}&t=${Date.now()}`);
        } else {
          setLogoPreview(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
      showToast('Error al consultar configuración institucional.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG).', 'warning');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('El logotipo no debe superar los 2MB de tamaño.', 'warning');
      return;
    }

    setTipoLogo(file.type);
    setEliminarLogo(false);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoBase64(reader.result);
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombreEscuela.trim()) {
      showToast('El nombre institucional de la escuela no puede estar vacío.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre_escuela: nombreEscuela.trim(),
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
        color_complementario: colorComplementario,
      };

      if (eliminarLogo) {
        payload.eliminar_logo = true;
      } else if (logoBase64) {
        payload.logoBase64 = logoBase64;
        payload.tipo_logo = tipoLogo;
      }

      const res = await api.updateDirectivoConfiguracion(payload);
      if (res.success) {
        showToast('Identidad institucional actualizada exitosamente.', 'success');
        setLogoBase64(null);
        setEliminarLogo(false);
        if (res.escuela?.tiene_logo) {
          setLogoPreview(`/api/directivo/logo?escuela=${res.escuela.id_escuela}&t=${Date.now()}`);
        } else {
          setLogoPreview(null);
        }
        if (onEscuelaUpdated) {
          onEscuelaUpdated(res.escuela);
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar la configuración.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const colorPresets = [
    { name: 'SICARA Vino Rural', p: '#722F37', s: '#4A1722', c: '#A64D5A' },
    { name: 'Azul Institucional', p: '#1E40AF', s: '#172554', c: '#3B82F6' },
    { name: 'Verde Bosque / Conafe', p: '#166534', s: '#052E16', c: '#22C55E' },
    { name: 'Café Colonial', p: '#78350F', s: '#451A03', c: '#B45309' },
    { name: 'Gris Grafito', p: '#374151', s: '#111827', c: '#6B7280' },
  ];

  if (loading) {
    return (
      <div className="py-12 text-center text-app-muted">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-vino-primary" />
        Cargando configuración institucional...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <Settings className="w-5 h-5 text-vino-primary" />
            Configuración Institucional e Identidad Visual
          </h2>
          <p className="text-xs text-app-muted">
            Personalice el logotipo, nombre visible y la paleta de colores oficial de su escuela
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: colorPrimario }}
          className="px-5 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Logotipo y Nombre */}
        <div className="bg-white rounded-card p-6 border border-app-border shadow-soft space-y-5">
          <h3 className="text-sm font-bold text-app-text pb-2 border-b border-app-border flex items-center gap-2">
            <School className="w-4 h-4 text-vino-primary" />
            Logotipo y Nombre de la Escuela
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Contenedor del Logotipo con Preview */}
            <div className="relative group shrink-0">
              <div
                style={{ borderColor: colorPrimario }}
                className="w-28 h-28 rounded-2xl border-2 border-dashed bg-gray-50 flex items-center justify-center overflow-hidden shadow-inner p-2"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo Escuela"
                    className="w-full h-full object-contain"
                    onError={() => {
                      setLogoPreview(null);
                    }}
                  />
                ) : (
                  <div className="text-center text-app-muted">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-app-muted" />
                    <span className="text-[10px] font-bold block">Subir Logo</span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-center space-y-1">
                <label className="inline-block">
                  <span className="px-3 py-1 rounded-subtle bg-gray-100 hover:bg-gray-200 text-app-text font-bold text-[11px] cursor-pointer transition-colors shadow-xs">
                    {logoPreview ? 'Cambiar logo...' : 'Examinar...'}
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>

                {logoPreview && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null);
                        setLogoBase64(null);
                        setEliminarLogo(true);
                      }}
                      className="text-[10px] font-semibold text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                    >
                      Quitar logo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nombre y CCT */}
            <div className="flex-1 space-y-4 w-full">
              <div>
                <label className="block font-bold text-app-text mb-1 text-xs uppercase tracking-wider">
                  Nombre Oficial o Visible del Plantel <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nombreEscuela}
                  onChange={(e) => setNombreEscuela(e.target.value)}
                  placeholder="Ej. Escuela Primaria Rural Juan Escutia"
                  className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
                />
                <p className="text-[11px] text-app-muted mt-1">
                  Este nombre se mostrará en el menú lateral, encabezados y en los reportes escolares expedidos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-subtle border border-app-border">
                <div>
                  <span className="font-bold text-app-muted block uppercase text-[10px]">
                    Clave CCT
                  </span>
                  <span className="font-mono font-bold text-app-text">
                    {infoFija?.cct || 'S/N'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-app-muted block uppercase text-[10px]">
                    Nivel y Turno
                  </span>
                  <span className="font-semibold text-app-text">
                    {infoFija?.nivel_educativo || 'Primaria'} ({infoFija?.turno || 'Matutino'})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Colores Institucionales */}
        <div className="bg-white rounded-card p-6 border border-app-border shadow-soft space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-app-border">
            <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
              <Palette className="w-4 h-4 text-vino-primary" />
              Paleta de Colores Institucionales
            </h3>
            <span className="text-[11px] text-app-muted">Personalización por escuela</span>
          </div>

          {/* Paletas sugeridas predefinidas */}
          <div>
            <span className="text-xs font-bold text-app-text block mb-2">Paletas de Color Rápidas:</span>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setColorPrimario(preset.p);
                    setColorSecundario(preset.s);
                    setColorComplementario(preset.c);
                  }}
                  className="px-3 py-1.5 rounded-card border border-app-border bg-gray-50 hover:bg-gray-100 flex items-center gap-2 text-xs cursor-pointer transition-all"
                >
                  <div className="flex -space-x-1">
                    <div style={{ backgroundColor: preset.p }} className="w-3.5 h-3.5 rounded-full" />
                    <div style={{ backgroundColor: preset.s }} className="w-3.5 h-3.5 rounded-full" />
                    <div style={{ backgroundColor: preset.c }} className="w-3.5 h-3.5 rounded-full" />
                  </div>
                  <span className="font-semibold text-app-text text-[11px]">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selectores de color individuales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            {/* Color Primario */}
            <div className="p-3 rounded-card border border-app-border bg-gray-50/50">
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                Color Principal
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-app-border p-0.5 bg-white shrink-0"
                />
                <input
                  type="text"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-subtle border border-app-border font-mono text-xs uppercase"
                />
              </div>
              <p className="text-[10px] text-app-muted mt-2">
                Botones primarios, insignias activas y realces de gráficas.
              </p>
            </div>

            {/* Color Secundario */}
            <div className="p-3 rounded-card border border-app-border bg-gray-50/50">
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                Color Secundario
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={colorSecundario}
                  onChange={(e) => setColorSecundario(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-app-border p-0.5 bg-white shrink-0"
                />
                <input
                  type="text"
                  value={colorSecundario}
                  onChange={(e) => setColorSecundario(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-subtle border border-app-border font-mono text-xs uppercase"
                />
              </div>
              <p className="text-[10px] text-app-muted mt-2">
                Fondo del menú lateral de navegación institucional.
              </p>
            </div>

            {/* Color Complementario */}
            <div className="p-3 rounded-card border border-app-border bg-gray-50/50">
              <label className="block font-bold text-app-text mb-1 uppercase tracking-wider text-[11px]">
                Color Complementario
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={colorComplementario}
                  onChange={(e) => setColorComplementario(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-app-border p-0.5 bg-white shrink-0"
                />
                <input
                  type="text"
                  value={colorComplementario}
                  onChange={(e) => setColorComplementario(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-subtle border border-app-border font-mono text-xs uppercase"
                />
              </div>
              <p className="text-[10px] text-app-muted mt-2">
                Acentos secundarios, bordes sutiles e indicadores.
              </p>
            </div>
          </div>

          {/* Vista Previa en Vivo */}
          <div className="mt-4 p-4 rounded-card border border-app-border bg-white shadow-soft">
            <span className="text-xs font-bold text-app-text block mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-app-muted" />
              Vista Previa de la Identidad en Vivo
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-app-bg border border-app-border">
              <div
                style={{ backgroundColor: colorSecundario }}
                className="w-full sm:w-48 p-3 rounded-card text-white text-xs space-y-2"
              >
                <div className="font-bold text-[11px] truncate">{nombreEscuela || 'Mi Escuela'}</div>
                <div
                  style={{ backgroundColor: colorPrimario }}
                  className="p-1.5 rounded text-center font-bold text-[10px]"
                >
                  Elemento Activo
                </div>
              </div>

              <div className="flex-1 space-y-2 w-full text-xs">
                <div className="flex gap-2">
                  <button
                    type="button"
                    style={{ backgroundColor: colorPrimario }}
                    className="px-3 py-1.5 rounded-subtle text-white font-bold text-xs"
                  >
                    Botón Principal
                  </button>
                  <button
                    type="button"
                    style={{ borderColor: colorComplementario, color: colorComplementario }}
                    className="px-3 py-1.5 rounded-subtle border font-bold text-xs bg-white"
                  >
                    Detalle Borde
                  </button>
                </div>
                <p className="text-[11px] text-app-muted">
                  Los colores seleccionados se aplicarán al instante a todo su panel directivo al guardar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

