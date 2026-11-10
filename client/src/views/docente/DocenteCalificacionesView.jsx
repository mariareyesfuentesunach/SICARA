import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  Save,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Filter,
  FileDown,
  Printer,
  Table,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function DocenteCalificacionesView({ docente, asignaciones = [] }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modo de visualización: 'materia' (Captura por materia individual) o 'boleta' (Matriz de todas las materias y promedio general)
  const [vistaModo, setVistaModo] = useState('materia'); // 'materia' | 'boleta'

  const [selectedGrupoId, setSelectedGrupoId] = useState(asignaciones[0]?.id_grupo || '');
  const [selectedMateriaId, setSelectedMateriaId] = useState(asignaciones[0]?.id_materia || '');
  const [selectedPeriodo, setSelectedPeriodo] = useState('Periodo 1');
  const [search, setSearch] = useState('');
  const [alumnos, setAlumnos] = useState([]);

  // Estado para la matriz de boleta completa
  const [boletaData, setBoletaData] = useState({
    materias: [],
    alumnos: [],
    grupo: null,
  });
  const [loadingBoleta, setLoadingBoleta] = useState(false);

  const boletaPrintRef = useRef(null);
  const primaryColor = docente?.color_primario || '#722F37';

  useEffect(() => {
    if (!selectedGrupoId && asignaciones.length > 0) {
      setSelectedGrupoId(asignaciones[0].id_grupo);
      setSelectedMateriaId(asignaciones[0].id_materia);
    }
  }, [asignaciones]);

  // Cargar calificaciones por materia individual
  const fetchCalificaciones = async () => {
    if (!selectedGrupoId) return;
    setLoading(true);
    try {
      const res = await api.getDocenteCalificaciones({
        id_grupo: selectedGrupoId,
        id_materia: selectedMateriaId,
        periodo: selectedPeriodo,
      });

      if (res.success) {
        setAlumnos(res.alumnos || []);
      }
    } catch (err) {
      console.error('Error al cargar calificaciones:', err);
      showToast('Error al cargar lista de calificaciones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar matriz general para boletas de todas las materias
  const fetchBoletaData = async () => {
    if (!selectedGrupoId) return;
    setLoadingBoleta(true);
    try {
      const res = await api.getDocenteBoletaGrupo({
        id_grupo: selectedGrupoId,
        periodo: selectedPeriodo,
      });

      if (res.success) {
        setBoletaData({
          materias: res.materias || [],
          alumnos: res.alumnos || [],
          grupo: res.grupo || null,
        });
      }
    } catch (err) {
      console.error('Error al cargar boleta general:', err);
      showToast('Error al cargar matriz general de materias.', 'error');
    } finally {
      setLoadingBoleta(false);
    }
  };

  useEffect(() => {
    if (vistaModo === 'materia') {
      fetchCalificaciones();
    } else {
      fetchBoletaData();
    }
  }, [selectedGrupoId, selectedMateriaId, selectedPeriodo, vistaModo]);

  const handleNotaChange = (id_alumno, val) => {
    const num = val === '' ? '' : parseFloat(val);
    setAlumnos((prev) =>
      prev.map((al) => {
        if (al.id_alumno !== id_alumno) return al;
        let color = 'gray';
        let rango = 'sin_evaluar';
        if (num !== '') {
          if (num >= 9.0) {
            color = 'verde';
            rango = 'verde';
          } else if (num >= 7.0) {
            color = 'amarillo';
            rango = 'amarillo';
          } else {
            color = 'rojo';
            rango = 'rojo';
          }
        }
        return { ...al, calificacion: num, color, rango };
      })
    );
  };

  const handleObsChange = (id_alumno, val) => {
    setAlumnos((prev) =>
      prev.map((al) => (al.id_alumno === id_alumno ? { ...al, observaciones: val } : al))
    );
  };

  const handleGuardar = async () => {
    if (!selectedGrupoId || !selectedMateriaId) return;
    setSaving(true);
    try {
      const payload = {
        id_grupo: selectedGrupoId,
        id_materia: selectedMateriaId,
        periodo: selectedPeriodo,
        calificaciones: alumnos
          .filter((al) => al.calificacion !== '' && al.calificacion !== null)
          .map((al) => ({
            id_alumno: al.id_alumno,
            calificacion: al.calificacion,
            observaciones: al.observaciones || '',
          })),
      };

      const res = await api.guardarDocenteCalificaciones(payload);
      if (res.success) {
        let msg = res.message || 'Calificaciones guardadas exitosamente.';
        if (res.alertasBajoRendimiento > 0) {
          msg += ` Se registraron ${res.alertasBajoRendimiento} alerta(s) por bajo rendimiento (0.0 a 6.9).`;
        }
        showToast(msg, 'success');
        fetchCalificaciones();
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar calificaciones.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Imprimir o guardar boleta oficial en PDF mediante ventana del navegador
  const handleDescargarBoleta = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Por favor habilite las ventanas emergentes para descargar la boleta.', 'warning');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Boleta de Calificaciones - SICARA</title>
        <style>
          @page { size: letter landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; margin: 0; padding: 20px; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid ${primaryColor}; padding-bottom: 12px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; color: ${primaryColor}; text-transform: uppercase; }
          .header h2 { margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: #4b5563; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; }
          .meta-item strong { color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; }
          th { background-color: #f9fafb; font-weight: bold; color: #374151; }
          th.alumno, td.alumno { text-align: left; }
          .verde { background-color: #d1fae5; color: #065f46; font-weight: bold; }
          .amarillo { background-color: #fef3c7; color: #92400e; font-weight: bold; }
          .rojo { background-color: #fee2e2; color: #991b1b; font-weight: bold; }
          .promedio { font-weight: 900; font-size: 11px; }
          .footer { margin-top: 30px; display: flex; justify-content: space-around; text-align: center; font-size: 11px; }
          .firma { border-top: 1px solid #9ca3af; width: 220px; padding-top: 5px; margin-top: 40px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${docente?.nombre_escuela || 'SISTEMA INSTITUCIONAL SICARA'}</h1>
          <h2>BOLETA OFICIAL DE EVALUACIÓN Y RENDIMIENTO ACADÉMICO</h2>
          <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">CCT: ${docente?.cct || 'N/A'} • Ciclo Escolar: ${boletaData.grupo?.ciclo_escolar || '2024-2025'}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><strong>Grupo:</strong> ${boletaData.grupo?.nombre_grupo || ''} (${boletaData.grupo?.grado || ''}° Grado)</div>
          <div class="meta-item"><strong>Periodo de Evaluación:</strong> ${selectedPeriodo}</div>
          <div class="meta-item"><strong>Docente Titular:</strong> ${docente?.nombre} ${docente?.apellidos || ''}</div>
          <div class="meta-item"><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-MX')}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th class="alumno">Nombre del Alumno</th>
              <th>CURP</th>
              ${boletaData.materias.map((m) => `<th>${m.nombre_materia}</th>`).join('')}
              <th style="background-color: #e5e7eb;">Promedio General</th>
              <th>Estado / Rango</th>
            </tr>
          </thead>
          <tbody>
            ${boletaData.alumnos
              .map((al, idx) => {
                const colorCls = al.colorGeneral || '';
                const rangoTxt =
                  al.colorGeneral === 'verde'
                    ? 'Sobresaliente (10-9)'
                    : al.colorGeneral === 'amarillo'
                    ? 'Regular (8.9-7)'
                    : al.colorGeneral === 'rojo'
                    ? 'Bajo Rendimiento (6.9-0)'
                    : 'Sin Evaluar';
                return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="alumno"><strong>${al.apellidos ? `${al.apellidos}, ` : ''}${al.nombre}</strong></td>
                  <td style="font-family: monospace;">${al.curp || 'S/C'}</td>
                  ${boletaData.materias
                    .map((m) => {
                      const nota = al.notasPorMateria ? al.notasPorMateria[mat?.id_materia || m.id_materia] : null;
                      const notaColor =
                        nota !== null && nota !== undefined
                          ? nota >= 9
                            ? 'verde'
                            : nota >= 7
                            ? 'amarillo'
                            : 'rojo'
                          : '';
                      return `<td class="${notaColor}">${nota !== null && nota !== undefined ? nota : '--'}</td>`;
                    })
                    .join('')}
                  <td class="promedio ${colorCls}">${al.promedioGeneral !== null ? al.promedioGeneral : '--'}</td>
                  <td class="${colorCls}">${rangoTxt}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <div style="margin-top: 15px; font-size: 10px; color: #4b5563;">
          <strong>Escala de Rendimiento:</strong> 
          <span style="color: #065f46;">Verde: 10.0 a 9.0 (Sobresaliente)</span> | 
          <span style="color: #92400e;">Amarillo: 8.9 a 7.0 (Regular)</span> | 
          <span style="color: #991b1b;">Rojo: 6.9 a 0.0 (Bajo Rendimiento)</span>
        </div>

        <div class="footer">
          <div class="firma">
            <strong>${docente?.nombre} ${docente?.apellidos || ''}</strong><br>
            Firma del Docente Responsable
          </div>
          <div class="firma">
            <strong>Dirección Escolar</strong><br>
            Sello y Validación Institucional
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const alumnosFiltrados = (vistaModo === 'materia' ? alumnos : boletaData.alumnos).filter((al) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nom = `${al.nombre} ${al.apellidos || ''}`.toLowerCase();
    const curp = (al.curp || '').toLowerCase();
    return nom.includes(q) || curp.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="bg-white rounded-card p-5 border border-app-border shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
            <Award className="w-5 h-5 text-vino-primary" />
            Evaluación Curricular y Boleta de Calificaciones
          </h2>
          <p className="text-xs text-app-muted">
            Calificaciones por materia, cálculo de promedio general del alumno y descarga de boleta oficial
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Conmutador de modo: Captura por Materia o Boleta General */}
          <div className="inline-flex rounded-subtle border border-app-border bg-gray-50 p-0.5">
            <button
              onClick={() => setVistaModo('materia')}
              className={`px-3 py-1.5 rounded-subtle text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                vistaModo === 'materia'
                  ? 'bg-white text-vino-primary shadow-xs'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Por Materia</span>
            </button>
            <button
              onClick={() => setVistaModo('boleta')}
              className={`px-3 py-1.5 rounded-subtle text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                vistaModo === 'boleta'
                  ? 'bg-white text-vino-primary shadow-xs'
                  : 'text-app-muted hover:text-app-text'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Boleta General</span>
            </button>
          </div>

          {vistaModo === 'materia' ? (
            <button
              type="button"
              onClick={handleGuardar}
              disabled={saving || loading || alumnos.length === 0}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Calificaciones'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDescargarBoleta}
              disabled={loadingBoleta || boletaData.alumnos.length === 0}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-subtle text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-90 transition-all disabled:opacity-50"
              title="Descargar / Imprimir boleta oficial en PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>Descargar Boleta</span>
            </button>
          )}
        </div>
      </div>

      {/* Selectores */}
      <div className="bg-white rounded-card p-4 border border-app-border shadow-soft grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
            Grupo Escolar
          </label>
          <select
            value={selectedGrupoId}
            onChange={(e) => {
              const gId = e.target.value;
              setSelectedGrupoId(gId);
              const asig = asignaciones.find((a) => a.id_grupo === gId);
              if (asig) setSelectedMateriaId(asig.id_materia);
            }}
            className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-medium"
          >
            {asignaciones.map((asig) => (
              <option key={asig.id_grupo_docente} value={asig.id_grupo}>
                {asig.nombre_grupo} ({asig.grado}° - {asig.nombre_materia})
              </option>
            ))}
          </select>
        </div>

        {vistaModo === 'materia' && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
              Materia Curricular
            </label>
            <select
              value={selectedMateriaId}
              onChange={(e) => setSelectedMateriaId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-medium"
            >
              {asignaciones
                .filter((a) => a.id_grupo === selectedGrupoId)
                .map((asig) => (
                  <option key={asig.id_materia} value={asig.id_materia}>
                    {asig.nombre_materia}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
            Periodo de Evaluación
          </label>
          <select
            value={selectedPeriodo}
            onChange={(e) => setSelectedPeriodo(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary bg-white text-app-text font-medium"
          >
            <option value="Periodo 1">Trimestre / Periodo 1</option>
            <option value="Periodo 2">Trimestre / Periodo 2</option>
            <option value="Periodo 3">Trimestre / Periodo 3</option>
            <option value="Final">Promedio Final</option>
          </select>
        </div>

        <div className={vistaModo === 'boleta' ? 'sm:col-span-2' : ''}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-app-muted mb-1">
            Buscar Alumno
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-app-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre o CURP..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-subtle border border-app-border focus:outline-none focus:border-vino-primary"
            />
          </div>
        </div>
      </div>

      {/* Regla de Alerta de Calificación Menor a 7.0 (Rango Rojo: 6.9 a 0) */}
      <div className="bg-red-50 border border-red-200 text-red-900 rounded-card p-3 text-xs flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
        <p className="leading-relaxed">
          <strong>Regla de Alerta de Rendimiento:</strong> Alumno con calificación en rango <strong>Rojo (6.9 a 0.0)</strong> genera automáticamente alerta por bajo rendimiento. El rango <strong>Amarillo es de 8.9 a 7.0</strong> y el rango <strong>Verde es de 10.0 a 9.0</strong>.
        </p>
      </div>

      {/* VISTA 1: CAPTURA POR MATERIA */}
      {vistaModo === 'materia' && (
        <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-app-border bg-gray-50/75 text-app-muted font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Alumno</th>
                  <th className="py-3 px-4">CURP</th>
                  <th className="py-3 px-4 text-center">Calificación (0 - 10)</th>
                  <th className="py-3 px-4 text-center">Rango Asignado</th>
                  <th className="py-3 px-4">Observaciones Pedagógicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/60">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-app-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                      Cargando calificaciones...
                    </td>
                  </tr>
                ) : alumnosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-app-muted">
                      No hay alumnos inscritos en este grupo.
                    </td>
                  </tr>
                ) : (
                  alumnosFiltrados.map((al) => (
                    <tr key={al.id_alumno} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-app-text text-sm">
                          {al.apellidos ? `${al.apellidos}, ` : ''}{al.nombre}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-app-muted">
                        {al.curp || 'S/C'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={al.calificacion !== null && al.calificacion !== undefined ? al.calificacion : ''}
                          onChange={(e) => handleNotaChange(al.id_alumno, e.target.value)}
                          placeholder="0 - 10"
                          className={`w-20 px-2.5 py-1 text-center font-bold text-sm rounded border focus:outline-none ${
                            al.color === 'verde'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : al.color === 'amarillo'
                              ? 'border-amber-500 bg-amber-50 text-amber-800'
                              : al.color === 'rojo'
                              ? 'border-red-500 bg-red-50 text-red-800'
                              : 'border-app-border bg-white text-app-text'
                          }`}
                        />
                      </td>

                      <td className="py-3 px-4 text-center">
                        {al.color === 'verde' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 Verde: 10 - 9
                          </span>
                        )}
                        {al.color === 'amarillo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            🟡 Amarillo: 8.9 - 7
                          </span>
                        )}
                        {al.color === 'rojo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            🔴 Rojo: 6.9 - 0
                          </span>
                        )}
                        {al.color === 'gray' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                            ⚪ Sin Evaluar
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={al.observaciones || ''}
                          onChange={(e) => handleObsChange(al.id_alumno, e.target.value)}
                          placeholder="Recomendación o aspecto a fortalecer..."
                          className="w-full px-2.5 py-1 text-xs rounded border border-app-border focus:outline-none focus:border-vino-primary bg-white"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: BOLETA GENERAL CON TODAS LAS MATERIAS Y PROMEDIO GENERAL */}
      {vistaModo === 'boleta' && (
        <div ref={boletaPrintRef} className="space-y-4">
          <div className="bg-white rounded-card border border-app-border shadow-soft overflow-hidden">
            <div className="p-4 bg-gray-50/80 border-b border-app-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-app-text">
                  Matriz de Calificaciones del Grupo: {boletaData.grupo?.nombre_grupo} ({boletaData.grupo?.grado}° Grado)
                </h3>
                <p className="text-[11px] text-app-muted">
                  {boletaData.materias.length} materias curriculares evaluadas en {selectedPeriodo}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDescargarBoleta}
                  className="px-3.5 py-2 rounded-subtle bg-vino-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Exportar Boleta</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-app-border bg-white text-app-muted font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 sticky left-0 bg-white shadow-xs">Alumno</th>
                    <th className="py-3 px-4">CURP</th>
                    {boletaData.materias.map((mat) => (
                      <th key={mat.id_materia} className="py-3 px-3 text-center whitespace-nowrap">
                        {mat.nombre_materia}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-center bg-gray-100 font-black text-app-text">
                      Promedio General
                    </th>
                    <th className="py-3 px-4 text-center">Rango de Desempeño</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {loadingBoleta ? (
                    <tr>
                      <td colSpan={boletaData.materias.length + 4} className="py-12 text-center text-app-muted">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-vino-primary" />
                        Calculando promedios generales y boleta...
                      </td>
                    </tr>
                  ) : alumnosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={boletaData.materias.length + 4} className="py-10 text-center text-app-muted">
                        No se encontraron alumnos registrados en este grupo.
                      </td>
                    </tr>
                  ) : (
                    alumnosFiltrados.map((al) => (
                      <tr key={al.id_alumno} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-app-text sticky left-0 bg-white shadow-xs whitespace-nowrap">
                          {al.apellidos ? `${al.apellidos}, ` : ''}{al.nombre}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-app-muted whitespace-nowrap">
                          {al.curp || 'S/C'}
                        </td>

                        {/* Calificación por cada materia */}
                        {boletaData.materias.map((mat) => {
                          const nota = al.notasPorMateria ? al.notasPorMateria[mat.id_materia] : null;
                          return (
                            <td key={mat.id_materia} className="py-3 px-3 text-center">
                              {nota !== null && nota !== undefined ? (
                                <span
                                  className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                    nota >= 9
                                      ? 'text-emerald-800 bg-emerald-50'
                                      : nota >= 7
                                      ? 'text-amber-800 bg-amber-50'
                                      : 'text-red-800 bg-red-50'
                                  }`}
                                >
                                  {nota}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-mono">--</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Promedio General del alumno */}
                        <td className="py-3 px-4 text-center bg-gray-50/80">
                          {al.promedioGeneral !== null ? (
                            <span
                              className={`font-mono font-black text-sm px-2.5 py-1 rounded shadow-xs ${
                                al.colorGeneral === 'verde'
                                  ? 'bg-emerald-600 text-white'
                                  : al.colorGeneral === 'amarillo'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-red-600 text-white'
                              }`}
                            >
                              {al.promedioGeneral}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono">Sin notas</span>
                          )}
                        </td>

                        {/* Rango */}
                        <td className="py-3 px-4 text-center">
                          {al.colorGeneral === 'verde' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🟢 Sobresaliente
                            </span>
                          )}
                          {al.colorGeneral === 'amarillo' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              🟡 Regular
                            </span>
                          )}
                          {al.colorGeneral === 'rojo' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                              🔴 Bajo Rendimiento
                            </span>
                          )}
                          {al.colorGeneral === 'gray' && (
                            <span className="text-[10px] text-app-muted italic">Pendiente</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
