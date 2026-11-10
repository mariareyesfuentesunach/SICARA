import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  Users,
  Layers,
  BookOpen,
  GraduationCap,
  Link as LinkIcon,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  parseSpreadsheetSheets,
  downloadUnifiedSchoolWorkbook,
  downloadXLSXTemplate,
  downloadCSVTemplate,
  normalizeHeader,
} from '../../utils/csvParser';

export default function DirectivoImportacionIntegralView({ escuela }) {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen'); // 'resumen', 'grupos', 'materias', 'docentes', 'alumnos', 'asignaciones'

  // Datos parseados listos para importar
  const [dataGrupos, setDataGrupos] = useState([]);
  const [dataMaterias, setDataMaterias] = useState([]);
  const [dataDocentes, setDataDocentes] = useState([]);
  const [dataAlumnos, setDataAlumnos] = useState([]);
  const [dataAsignaciones, setDataAsignaciones] = useState([]);

  // Archivos cargados para referencia
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [importResult, setImportResult] = useState(null);

  const primaryColor = escuela?.color_primario || '#722F37';

  // -------------------------------------------------------------
  // Detección automática del tipo de CSV / Excel por nombre de hoja y cabeceras
  // -------------------------------------------------------------
  const detectAndClassifyRows = (parsedRows, fileNameOrSheet = '') => {
    if (!parsedRows || parsedRows.length === 0) return null;

    const normName = normalizeHeader(fileNameOrSheet);
    const sample = parsedRows[0];
    const keys = Object.keys(sample);

    // Heurísticas de cabecera:
    const hasCurp = keys.some((k) => k.includes('curp'));
    const hasCorreo = keys.some((k) => k.includes('correo') || k.includes('email'));
    const hasMateria = keys.some((k) => k.includes('materia') || k.includes('asignatura'));
    const hasGrupo = keys.some((k) => k.includes('grupo') || k.includes('seccion') || k.includes('aula'));
    const hasDocente = keys.some((k) => k.includes('docente') || k.includes('profesor') || k.includes('maestro'));
    const hasGrado = keys.some((k) => k.includes('grado'));
    const hasTutor = keys.some((k) => k.includes('tutor') || k.includes('contacto'));

    // PRIORIDAD 1: Identificación por nombre de la hoja o nombre del archivo
    if (
      normName.includes('asignacion') ||
      normName.includes('relacion') ||
      normName.includes('carga_docente') ||
      normName.includes('horario')
    ) {
      const formatted = parsedRows
        .map((r) => ({
          grupo: r.grupo || r.nombre_grupo || '',
          materia: r.materia || r.nombre_materia || '',
          docente: r.docente || r.correo_docente || r.nombre_docente || '',
        }))
        .filter((a) => a.grupo || a.materia || a.docente);

      setDataAsignaciones((prev) => [...prev, ...formatted]);
      return { type: 'asignaciones', count: formatted.length };
    }

    if (
      normName.includes('docente') ||
      normName.includes('profesor') ||
      normName.includes('maestro') ||
      normName.includes('plantilla_docente')
    ) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || '',
          apellidos: r.apellidos || '',
          correo: r.correo || r.email || '',
          curp: (r.curp || '').toUpperCase(),
          telefono: r.telefono || '',
          especialidad: r.especialidad || '',
        }))
        .filter((d) => d.nombre && (d.correo || d.curp));

      setDataDocentes((prev) => [...prev, ...formatted]);
      return { type: 'docentes', count: formatted.length };
    }

    if (
      normName.includes('alumno') ||
      normName.includes('estudiante') ||
      normName.includes('matricula') ||
      normName.includes('registro_de_alumno')
    ) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || '',
          apellidos: r.apellidos || '',
          curp: (r.curp || '').toUpperCase(),
          genero: r.genero || '',
          fecha_nacimiento: r.fecha_nacimiento || '',
          grupo: r.grupo || r.nombre_grupo || '',
          nombre_tutor: r.nombre_tutor || r.tutor || '',
          telefono_tutor: r.telefono_tutor || r.telefono || '',
        }))
        .filter((a) => a.nombre);

      setDataAlumnos((prev) => [...prev, ...formatted]);
      return { type: 'alumnos', count: formatted.length };
    }

    if (
      normName.includes('materia') ||
      normName.includes('asignatura') ||
      normName.includes('catalogo_de_materia')
    ) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || r.materia || r.nombre_materia || '',
          grado: r.grado || '',
          horas_semanales: r.horas_semanales || r.horas || 4,
        }))
        .filter((m) => m.nombre);

      setDataMaterias((prev) => [...prev, ...formatted]);
      return { type: 'materias', count: formatted.length };
    }

    if (
      normName.includes('grupo') ||
      normName.includes('aula') ||
      normName.includes('seccion') ||
      normName.includes('catalogo_de_grupo')
    ) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || r.grupo || '',
          grado: r.grado || '',
          ciclo_escolar: r.ciclo_escolar || r.ciclo || '2025-2026',
          turno: r.turno || 'Matutino',
        }))
        .filter((g) => g.nombre);

      setDataGrupos((prev) => [...prev, ...formatted]);
      return { type: 'grupos', count: formatted.length };
    }

    // PRIORIDAD 2: Heurísticas por contenido de columnas de la cabecera
    // 1. Asignaciones Curriculares (Grupo + Materia + Docente)
    if ((hasGrupo && hasMateria && hasDocente) || (hasMateria && hasDocente)) {
      const formatted = parsedRows
        .map((r) => ({
          grupo: r.grupo || r.nombre_grupo || '',
          materia: r.materia || r.nombre_materia || '',
          docente: r.docente || r.correo_docente || r.nombre_docente || '',
        }))
        .filter((a) => a.grupo || a.materia || a.docente);

      setDataAsignaciones((prev) => [...prev, ...formatted]);
      return { type: 'asignaciones', count: formatted.length };
    }

    // 2. Docentes (tienen correo o especialidad o teléfono y CURP)
    if (hasCorreo || (hasCurp && (keys.some((k) => k.includes('especialidad')) || !hasGrupo))) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || '',
          apellidos: r.apellidos || '',
          correo: r.correo || r.email || '',
          curp: (r.curp || '').toUpperCase(),
          telefono: r.telefono || '',
          especialidad: r.especialidad || '',
        }))
        .filter((d) => d.nombre && (d.correo || d.curp));

      setDataDocentes((prev) => [...prev, ...formatted]);
      return { type: 'docentes', count: formatted.length };
    }

    // 3. Alumnos (tienen curp o genero o tutor o columna grupo sin docente)
    if (hasCurp || hasTutor || (hasGrupo && !hasDocente && !hasMateria) || keys.some((k) => k.includes('matricula'))) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || '',
          apellidos: r.apellidos || '',
          curp: (r.curp || '').toUpperCase(),
          genero: r.genero || '',
          fecha_nacimiento: r.fecha_nacimiento || '',
          grupo: r.grupo || r.nombre_grupo || '',
          nombre_tutor: r.nombre_tutor || r.tutor || '',
          telefono_tutor: r.telefono_tutor || r.telefono || '',
        }))
        .filter((a) => a.nombre);

      setDataAlumnos((prev) => [...prev, ...formatted]);
      return { type: 'alumnos', count: formatted.length };
    }

    // 4. Materias (tienen materia o asignatura y horas o grado sin curp)
    if (hasMateria || keys.some((k) => k.includes('horas'))) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || r.materia || r.nombre_materia || '',
          grado: r.grado || '',
          horas_semanales: r.horas_semanales || r.horas || 4,
        }))
        .filter((m) => m.nombre);

      setDataMaterias((prev) => [...prev, ...formatted]);
      return { type: 'materias', count: formatted.length };
    }

    // 5. Grupos (tienen nombre, grado, turno, ciclo)
    if (hasGrado || keys.some((k) => k.includes('turno') || k.includes('ciclo'))) {
      const formatted = parsedRows
        .map((r) => ({
          nombre: r.nombre || r.grupo || '',
          grado: r.grado || '',
          ciclo_escolar: r.ciclo_escolar || r.ciclo || '2025-2026',
          turno: r.turno || 'Matutino',
        }))
        .filter((g) => g.nombre);

      setDataGrupos((prev) => [...prev, ...formatted]);
      return { type: 'grupos', count: formatted.length };
    }

    // Por descarte, si tiene nombre y apellidos tratar como alumno
    const fallbackAlumnos = parsedRows
      .map((r) => ({
        nombre: r.nombre || '',
        apellidos: r.apellidos || '',
        curp: (r.curp || '').toUpperCase(),
        grupo: r.grupo || '',
      }))
      .filter((a) => a.nombre);

    setDataAlumnos((prev) => [...prev, ...fallbackAlumnos]);
    return { type: 'alumnos', count: fallbackAlumnos.length };
  };

  // Manejo de lectura de archivos múltiples o individuales (.xlsx, .xls, .csv)
  const handleFilesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let processedSummary = [];

    for (const file of files) {
      try {
        const sheetsMap = await parseSpreadsheetSheets(file);
        const sheetEntries = Object.entries(sheetsMap);

        for (const [sheetName, sheetRows] of sheetEntries) {
          if (sheetRows && sheetRows.length > 0) {
            const result = detectAndClassifyRows(sheetRows, sheetName);
            const label = sheetEntries.length > 1 ? `${file.name} [${sheetName}]` : file.name;
            processedSummary.push(`${label} (${result?.count || sheetRows.length} ${result?.type || 'filas'})`);
          }
        }
      } catch (err) {
        console.error('Error al procesar archivo:', file.name, err);
        showToast(`Error al leer ${file.name}: ${err.message}`, 'error');
      }
    }

    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: (f.size / 1024).toFixed(1) + ' KB' })),
    ]);

    if (processedSummary.length > 0) {
      showToast(`Procesado exitosamente: ${processedSummary.join(', ')}`, 'success');
    }
  };

  const handleClearAll = () => {
    setDataGrupos([]);
    setDataMaterias([]);
    setDataDocentes([]);
    setDataAlumnos([]);
    setDataAsignaciones([]);
    setUploadedFiles([]);
    setImportResult(null);
    showToast('Datos de previsualización limpiados.', 'info');
  };

  // -------------------------------------------------------------
  // Envío e Importación en Backend
  // -------------------------------------------------------------
  const handleProcesarImportacion = async () => {
    const totalRegistros =
      dataGrupos.length +
      dataMaterias.length +
      dataDocentes.length +
      dataAlumnos.length +
      dataAsignaciones.length;

    if (totalRegistros === 0) {
      showToast('No hay registros cargados para importar. Suba uno o más archivos CSV.', 'warning');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const payload = {
        grupos: dataGrupos,
        materias: dataMaterias,
        docentes: dataDocentes,
        alumnos: dataAlumnos,
        asignaciones: dataAsignaciones,
      };

      const res = await api.importarEscuelaIntegral(payload);

      if (res.success) {
        setImportResult(res.resumen);
        showToast('¡Importación integral de la escuela completada con éxito!', 'success');
      } else {
        showToast(res.message || 'Ocurrió un inconveniente al procesar la importación.', 'error');
      }
    } catch (err) {
      console.error('Error en importación escolar:', err);
      showToast(err.message || 'Error de comunicación con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Descarga de Plantillas Oficiales (Excel .xlsx y CSV)
  // -------------------------------------------------------------
  const descargarLibroCompleto = () => {
    downloadUnifiedSchoolWorkbook('plantilla_escuela_completa.xlsx');
    showToast('Descargando libro completo de Excel con todas las hojas de la escuela...', 'success');
  };

  const descargarPlantillaGrupos = (fmt = 'xlsx') => {
    const headers = ['nombre', 'grado', 'ciclo_escolar', 'turno'];
    const rows = [
      ['1° A', '1', '2025-2026', 'Matutino'],
      ['1° B', '1', '2025-2026', 'Matutino'],
      ['2° A', '2', '2025-2026', 'Matutino'],
    ];
    if (fmt === 'xlsx') downloadXLSXTemplate('plantilla_grupos.xlsx', headers, rows, 'Grupos');
    else downloadCSVTemplate('plantilla_grupos.csv', headers, rows);
  };

  const descargarPlantillaMaterias = (fmt = 'xlsx') => {
    const headers = ['nombre', 'grado', 'horas_semanales'];
    const rows = [
      ['Matemáticas I', '1', '5'],
      ['Español I', '1', '5'],
      ['Ciencias I (Biología)', '1', '4'],
    ];
    if (fmt === 'xlsx') downloadXLSXTemplate('plantilla_materias.xlsx', headers, rows, 'Materias');
    else downloadCSVTemplate('plantilla_materias.csv', headers, rows);
  };

  const descargarPlantillaDocentes = (fmt = 'xlsx') => {
    const headers = ['nombre', 'apellidos', 'correo', 'curp', 'telefono', 'especialidad'];
    const rows = [
      ['Carlos', 'Ramírez Domínguez', 'carlos.ramirez@escuela.mx', 'RADC800101HDFRMN01', '9611234567', 'Matemáticas'],
      ['Laura', 'Mendoza Solís', 'laura.mendoza@escuela.mx', 'MESL850202MDFNLN02', '9619876543', 'Español'],
    ];
    if (fmt === 'xlsx') downloadXLSXTemplate('plantilla_docentes.xlsx', headers, rows, 'Docentes');
    else downloadCSVTemplate('plantilla_docentes.csv', headers, rows);
  };

  const descargarPlantillaAlumnos = (fmt = 'xlsx') => {
    const headers = ['nombre', 'apellidos', 'curp', 'genero', 'fecha_nacimiento', 'grupo', 'nombre_tutor', 'telefono_tutor'];
    const rows = [
      ['Pedro', 'Hernández Gómez', 'HEGP080512HDFRMN01', 'M', '2008-05-12', '1° A', 'Juan Hernández', '9611112233'],
      ['María', 'López Cruz', 'LOCM080720MDFNLN02', 'F', '2008-07-20', '1° A', 'Ana Cruz', '9614445566'],
      ['José', 'Pérez Morales', 'PEMJ070315HDFRMN03', 'M', '2007-03-15', '2° A', 'Carmen Morales', '9617778899'],
    ];
    if (fmt === 'xlsx') downloadXLSXTemplate('plantilla_alumnos_con_grupo.xlsx', headers, rows, 'Alumnos');
    else downloadCSVTemplate('plantilla_alumnos_con_grupo.csv', headers, rows);
  };

  const descargarPlantillaAsignaciones = (fmt = 'xlsx') => {
    const headers = ['grupo', 'materia', 'docente'];
    const rows = [
      ['1° A', 'Matemáticas I', 'carlos.ramirez@escuela.mx'],
      ['1° A', 'Español I', 'laura.mendoza@escuela.mx'],
      ['2° A', 'Matemáticas I', 'carlos.ramirez@escuela.mx'],
    ];
    if (fmt === 'xlsx') downloadXLSXTemplate('plantilla_relaciones_grupo_materia_docente.xlsx', headers, rows, 'Asignaciones');
    else downloadCSVTemplate('plantilla_relaciones_grupo_materia_docente.csv', headers, rows);
  };

  const totalCargado =
    dataGrupos.length +
    dataMaterias.length +
    dataDocentes.length +
    dataAlumnos.length +
    dataAsignaciones.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Superior Explicativo */}
      <div className="bg-white rounded-2xl p-6 border border-app-border shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              className="p-2 rounded-xl inline-flex items-center justify-center"
            >
              <UploadCloud className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-bold text-app-text">Carga Masiva e Integral de la Escuela</h2>
          </div>
          <p className="text-sm text-app-muted mt-1 max-w-3xl">
            Importe toda su institución educativa en una sola operación aceptando archivos <strong>Excel (.xlsx / .xls)</strong> y <strong>CSV</strong>.
            Puede subir un solo libro de Excel con múltiples hojas (Grupos, Materias, Docentes, Alumnos, Asignaciones) o varios archivos independientes.
          </p>
        </div>

        {totalCargado > 0 && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar todo
          </button>
        )}
      </div>

      {/* Zona de Descarga de Plantillas */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-700" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Plantillas Oficiales Excel (.xlsx) y CSV
              </h3>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Descargue los formatos preestablecidos. Puede utilizar el libro único multi-hoja o plantillas por entidad.
            </p>
          </div>

          {/* Botón Destacado: Libro Completo Multimodal */}
          <button
            onClick={descargarLibroCompleto}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Descargar Libro Completo Excel (.xlsx)
          </button>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
            O descargar plantillas individuales:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div className="flex items-center justify-between bg-white border border-gray-300 rounded-xl p-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <Layers className="w-4 h-4 text-emerald-600" />
                Grupos
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => descargarPlantillaGrupos('xlsx')}
                  className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer"
                  title="Descargar en Excel (.xlsx)"
                >
                  .xlsx
                </button>
                <button
                  onClick={() => descargarPlantillaGrupos('csv')}
                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  title="Descargar en CSV"
                >
                  .csv
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white border border-gray-300 rounded-xl p-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <BookOpen className="w-4 h-4 text-sky-600" />
                Materias
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => descargarPlantillaMaterias('xlsx')}
                  className="px-2 py-1 text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md cursor-pointer"
                  title="Descargar en Excel (.xlsx)"
                >
                  .xlsx
                </button>
                <button
                  onClick={() => descargarPlantillaMaterias('csv')}
                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  title="Descargar en CSV"
                >
                  .csv
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white border border-gray-300 rounded-xl p-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                Docentes
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => descargarPlantillaDocentes('xlsx')}
                  className="px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md cursor-pointer"
                  title="Descargar en Excel (.xlsx)"
                >
                  .xlsx
                </button>
                <button
                  onClick={() => descargarPlantillaDocentes('csv')}
                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  title="Descargar en CSV"
                >
                  .csv
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white border border-gray-300 rounded-xl p-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <Users className="w-4 h-4 text-amber-600" />
                Alumnos
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => descargarPlantillaAlumnos('xlsx')}
                  className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md cursor-pointer"
                  title="Descargar en Excel (.xlsx)"
                >
                  .xlsx
                </button>
                <button
                  onClick={() => descargarPlantillaAlumnos('csv')}
                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  title="Descargar en CSV"
                >
                  .csv
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white border border-gray-300 rounded-xl p-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <LinkIcon className="w-4 h-4 text-indigo-600" />
                Asignaciones
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => descargarPlantillaAsignaciones('xlsx')}
                  className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer"
                  title="Descargar en Excel (.xlsx)"
                >
                  .xlsx
                </button>
                <button
                  onClick={() => descargarPlantillaAsignaciones('csv')}
                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  title="Descargar en CSV"
                >
                  .csv
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cajón de Subida Drag & Drop */}
      <div className="bg-white border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-2xl p-8 text-center transition">
        <input
          type="file"
          id="csvMultiUpload"
          multiple
          accept=".xlsx, .xls, .csv, text/csv, text/plain, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFilesUpload}
          className="hidden"
        />
        <label
          htmlFor="csvMultiUpload"
          className="flex flex-col items-center justify-center cursor-pointer select-none"
        >
          <div
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition transform group-hover:scale-105"
          >
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <span className="text-base font-bold text-gray-800">
            Haga clic para seleccionar o arrastre sus archivos Excel (.xlsx / .xls) o CSV
          </span>
          <span className="text-xs text-gray-500 mt-1 max-w-lg">
            Acepta un único libro de Excel con múltiples hojas (Grupos, Materias, Docentes, Alumnos, Asignaciones) o
            archivos individuales en formato .xlsx o .csv. El sistema inspecciona y clasifica automáticamente.
          </span>
          <span className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition">
            Examinar archivos (.xlsx, .xls, .csv)
          </span>
        </label>

        {uploadedFiles.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-200 text-left">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Archivos leídos ({uploadedFiles.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  {f.name} <span className="text-gray-400">({f.size})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Indicadores de Entidades Detectadas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('grupos')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'grupos'
              ? 'bg-emerald-50 border-emerald-400 shadow-sm'
              : 'bg-white border-app-border hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {dataGrupos.length}
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-gray-800">Grupos</div>
          <div className="text-[11px] text-gray-500">Aulas y grados</div>
        </button>

        <button
          onClick={() => setActiveTab('materias')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'materias'
              ? 'bg-sky-50 border-sky-400 shadow-sm'
              : 'bg-white border-app-border hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              {dataMaterias.length}
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-gray-800">Materias</div>
          <div className="text-[11px] text-gray-500">Catálogo formativo</div>
        </button>

        <button
          onClick={() => setActiveTab('docentes')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'docentes'
              ? 'bg-purple-50 border-purple-400 shadow-sm'
              : 'bg-white border-app-border hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {dataDocentes.length}
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-gray-800">Docentes</div>
          <div className="text-[11px] text-gray-500">Con estado Pendiente</div>
        </button>

        <button
          onClick={() => setActiveTab('alumnos')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'alumnos'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-app-border hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {dataAlumnos.length}
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-gray-800">Alumnos</div>
          <div className="text-[11px] text-gray-500">Con grupo enlazado</div>
        </button>

        <button
          onClick={() => setActiveTab('asignaciones')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === 'asignaciones'
              ? 'bg-indigo-50 border-indigo-400 shadow-sm'
              : 'bg-white border-app-border hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <LinkIcon className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {dataAsignaciones.length}
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-gray-800">Asignaciones</div>
          <div className="text-[11px] text-gray-500">Grupo-Materia-Docente</div>
        </button>
      </div>

      {/* Regla de negocio destacada */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Garantía de activación y vinculación:</strong> Los docentes importados quedarán
          registrados con el estado <strong>Pendiente</strong>. Se les generará y enviará su invitación
          de alta para que ingresen con su <strong>CURP y Correo</strong> y definan su contraseña personal.
          Los alumnos se vincularán automáticamente al grupo cuyo nombre coincida con el especificado en el CSV.
        </div>
      </div>

      {/* Previsualización de Datos por Pestaña */}
      <div className="bg-white rounded-2xl border border-app-border shadow-soft overflow-hidden">
        <div className="p-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800 capitalize">
              Previsualización: {activeTab}
            </span>
            <span className="text-xs text-gray-500">
              (Mostrando primeros registros antes de importar)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === 'resumen' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Resumen
            </button>
          </div>
        </div>

        <div className="p-4 overflow-x-auto max-h-72">
          {activeTab === 'resumen' && (
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>Total de registros preparados:</strong> {totalCargado}
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                <li>{dataGrupos.length} Grupos listos para crear o sincronizar</li>
                <li>{dataMaterias.length} Materias listas para registrar</li>
                <li>{dataDocentes.length} Docentes en espera de alta en estado Pendiente</li>
                <li>{dataAlumnos.length} Alumnos para matricular y asignar a grupo</li>
                <li>{dataAsignaciones.length} Relaciones curriculares (Grupo + Materia + Docente)</li>
              </ul>
            </div>
          )}

          {activeTab === 'grupos' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Nombre Grupo</th>
                  <th className="p-2">Grado</th>
                  <th className="p-2">Ciclo Escolar</th>
                  <th className="p-2">Turno</th>
                </tr>
              </thead>
              <tbody>
                {dataGrupos.slice(0, 15).map((g, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2 text-gray-400">{i + 1}</td>
                    <td className="p-2 font-bold">{g.nombre}</td>
                    <td className="p-2">{g.grado}°</td>
                    <td className="p-2">{g.ciclo_escolar}</td>
                    <td className="p-2">{g.turno}</td>
                  </tr>
                ))}
                {dataGrupos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-400">
                      No hay grupos cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'materias' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Nombre Materia</th>
                  <th className="p-2">Grado</th>
                  <th className="p-2">Horas Semanales</th>
                </tr>
              </thead>
              <tbody>
                {dataMaterias.slice(0, 15).map((m, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2 text-gray-400">{i + 1}</td>
                    <td className="p-2 font-bold">{m.nombre}</td>
                    <td className="p-2">{m.grado ? `${m.grado}°` : 'General'}</td>
                    <td className="p-2">{m.horas_semanales} hrs</td>
                  </tr>
                ))}
                {dataMaterias.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-400">
                      No hay materias cargadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'docentes' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Nombre y Apellidos</th>
                  <th className="p-2">Correo Institucional</th>
                  <th className="p-2">CURP</th>
                  <th className="p-2">Especialidad</th>
                  <th className="p-2">Estado Inicial</th>
                </tr>
              </thead>
              <tbody>
                {dataDocentes.slice(0, 15).map((d, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2 text-gray-400">{i + 1}</td>
                    <td className="p-2 font-bold">{d.nombre} {d.apellidos}</td>
                    <td className="p-2 text-sky-700">{d.correo}</td>
                    <td className="p-2 font-mono">{d.curp}</td>
                    <td className="p-2">{d.especialidad || 'N/A'}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Pendiente
                      </span>
                    </td>
                  </tr>
                ))}
                {dataDocentes.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-400">
                      No hay docentes cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'alumnos' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Nombre y Apellidos</th>
                  <th className="p-2">CURP</th>
                  <th className="p-2">Grupo Destino</th>
                  <th className="p-2">Tutor</th>
                </tr>
              </thead>
              <tbody>
                {dataAlumnos.slice(0, 15).map((a, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2 text-gray-400">{i + 1}</td>
                    <td className="p-2 font-bold">{a.nombre} {a.apellidos}</td>
                    <td className="p-2 font-mono">{a.curp}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-800">
                        {a.grupo || 'Sin asignar'}
                      </span>
                    </td>
                    <td className="p-2">{a.nombre_tutor || 'N/A'}</td>
                  </tr>
                ))}
                {dataAlumnos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-400">
                      No hay alumnos cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'asignaciones' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Grupo</th>
                  <th className="p-2">Materia</th>
                  <th className="p-2">Docente (Correo / Nombre)</th>
                </tr>
              </thead>
              <tbody>
                {dataAsignaciones.slice(0, 15).map((asg, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2 text-gray-400">{i + 1}</td>
                    <td className="p-2 font-bold text-emerald-700">{asg.grupo}</td>
                    <td className="p-2 font-medium text-sky-700">{asg.materia}</td>
                    <td className="p-2 text-purple-700">{asg.docente}</td>
                  </tr>
                ))}
                {dataAsignaciones.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-400">
                      No hay asignaciones curriculares cargadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Botón de Ejecución Final */}
        <div className="p-4 bg-gray-50 border-t border-app-border flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {totalCargado > 0 ? (
              <span>Se procesarán <strong>{totalCargado}</strong> elementos en total en una transacción protegida.</span>
            ) : (
              <span>Suba al menos un archivo CSV para habilitar la importación.</span>
            )}
          </div>

          <button
            onClick={handleProcesarImportacion}
            disabled={totalCargado === 0 || loading}
            style={{ backgroundColor: primaryColor }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-soft hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importando Escuela...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Registrar e Importar Escuela
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resumen del Resultado de la Importación */}
      {importResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                ¡Importación Escolar Ejecutada Exitosamente!
              </h3>
              <p className="text-xs text-emerald-700">
                Todos los datos fueron guardados y relacionados en la base de datos de su plantel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-gray-500 block">Grupos</span>
              <span className="text-lg font-bold text-emerald-700">{importResult.gruposCreados}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-gray-500 block">Materias</span>
              <span className="text-lg font-bold text-sky-700">{importResult.materiasCreadas}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-gray-500 block">Docentes</span>
              <span className="text-lg font-bold text-purple-700">{importResult.docentesCreados}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-gray-500 block">Alumnos</span>
              <span className="text-lg font-bold text-amber-700">{importResult.alumnosCreados}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-gray-500 block">Asignaciones</span>
              <span className="text-lg font-bold text-indigo-700">{importResult.asignacionesCreadas}</span>
            </div>
          </div>

          {importResult.errores && importResult.errores.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded-xl border border-amber-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Observaciones durante la importación:
              </div>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                {importResult.errores.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

