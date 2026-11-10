/**
 * Utilidad unificada para procesamiento, parseo y descarga de archivos CSV y Excel (.xlsx / .xls)
 * Compatible con delimitadores por coma (,) y punto y coma (;), comillas RFC-4180,
 * codificación UTF-8 con BOM (\uFEFF) y libros de trabajo multi-hoja de Microsoft Excel (.xlsx / .xls).
 */
import * as XLSX from 'xlsx';

// Elimina acentos y normaliza texto para mapeo flexible de cabeceras
export function normalizeHeader(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Encuentra de forma inteligente la fila que contiene las cabeceras reales de las columnas.
 * Esto previene errores cuando los archivos Excel o CSV incluyen títulos, banners
 * o líneas en blanco antes de los encabezados de la tabla.
 */
export function findHeaderRowIndex(rows) {
  if (!rows || rows.length === 0) return 0;

  const commonKeywords = [
    'nombre',
    'curp',
    'correo',
    'email',
    'materia',
    'grupo',
    'docente',
    'grado',
    'apellidos',
    'apellido',
    'ciclo',
    'turno',
    'horas',
    'tutor',
    'genero',
    'sexo',
    'fecha',
    'matricula',
    'asignatura',
    'especialidad',
  ];

  // 1. Buscar en las primeras 15 filas la que tenga >= 2 columnas no vacías y coincida con palabras clave
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmpty.length < 2) continue;

    const matchesKeyword = row.some((cell) => {
      const norm = normalizeHeader(cell);
      return commonKeywords.some((kw) => norm.includes(kw));
    });

    if (matchesKeyword) return i;
  }

  // 2. Fallback: primera fila con 2 o más celdas no vacías
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length >= 2) {
      return i;
    }
  }

  return 0;
}

/**
 * Parsea el contenido de un texto plano CSV a un arreglo de objetos.
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  // Quitar BOM UTF-8 si existe
  let cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detectar delimitador inspeccionando las primeras líneas no vacías
  const lines = cleanText.split('\n').filter((l) => l.trim() !== '');
  const sampleLine = lines[0] || '';
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const semicolonCount = (sampleLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headerIndex = findHeaderRowIndex(rows);
  const rawHeaders = rows[headerIndex] || [];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  const dataRows = rows.slice(headerIndex + 1);

  return dataRows.map((row, rowIndex) => {
    const obj = { _rowNumber: rowIndex + headerIndex + 2 };
    normalizedHeaders.forEach((h, colIndex) => {
      if (h) {
        obj[h] = row[colIndex] !== undefined ? String(row[colIndex]).trim() : '';
      }
    });
    obj._raw = row;
    return obj;
  });
}

/**
 * Parsea un libro de trabajo Excel (.xlsx, .xls) a partir de un ArrayBuffer
 * Retorna un mapa { [sheetName]: rows[] } con las cabeceras normalizadas.
 */
export function parseXLSXBuffer(buffer) {
  if (!buffer) return {};

  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetsMap = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    // Convertir a matriz 2D de celdas con formateo de fechas
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    if (!rawData || rawData.length < 2) {
      sheetsMap[sheetName] = [];
      return;
    }

    const headerIndex = findHeaderRowIndex(rawData);
    const rawHeaders = (rawData[headerIndex] || []).map((h) => String(h || '').trim());
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    const dataRows = rawData.slice(headerIndex + 1);

    const rows = dataRows
      .filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ''))
      .map((row, idx) => {
        const obj = { _rowNumber: idx + headerIndex + 2, _sheetName: sheetName };
        normalizedHeaders.forEach((h, colIdx) => {
          if (h) {
            obj[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
          }
        });
        obj._raw = row;
        return obj;
      });

    sheetsMap[sheetName] = rows;
  });

  return sheetsMap;
}

/**
 * Función principal unificada para leer cualquier archivo .csv, .txt, .xlsx o .xls
 * Retorna una lista plana de objetos con cabeceras normalizadas.
 */
export async function parseSpreadsheetFile(file) {
  if (!file) return [];

  const fileName = (file.name || '').toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const sheets = parseXLSXBuffer(buffer);
    // Concatenar todas las hojas o la primera hoja con datos
    const sheetNames = Object.keys(sheets);
    if (sheetNames.length === 0) return [];

    let allRows = [];
    sheetNames.forEach((name) => {
      allRows = allRows.concat(sheets[name] || []);
    });
    return allRows;
  }

  // Si es CSV o TXT
  const text = await file.text();
  return parseCSV(text);
}

/**
 * Lee un archivo y retorna un desglose por hoja si es Excel, o { [nombreArchivo]: rows } si es CSV
 */
export async function parseSpreadsheetSheets(file) {
  if (!file) return {};

  const fileName = (file.name || '').toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    return parseXLSXBuffer(buffer);
  }

  // Si es CSV
  const text = await file.text();
  const rows = parseCSV(text);
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return { [baseName]: rows };
}

/**
 * Genera y descarga un archivo CSV con BOM UTF-8 para Excel
 */
export function downloadCSVTemplate(filename, headers, sampleRows = []) {
  const delimiter = ',';
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(delimiter);
  const dataLines = sampleRows.map((row) => row.map(escapeCell).join(delimiter));
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga un archivo Excel (.xlsx) nativo
 */
export function downloadXLSXTemplate(filename, headers, sampleRows = [], sheetName = 'Plantilla') {
  const data = [headers, ...sampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Auto-ajuste de ancho de columnas
  const colWidths = headers.map((h, i) => {
    let max = String(h).length;
    sampleRows.forEach((row) => {
      const cellLen = String(row[i] || '').length;
      if (cellLen > max) max = cellLen;
    });
    return { wch: Math.max(max + 4, 12) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename.replace(/\.csv$/, '')}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

/**
 * Genera y descarga un libro completo de Excel (.xlsx) con todas las hojas
 * requeridas para la carga escolar integral: Grupos, Materias, Docentes, Alumnos y Asignaciones.
 */
export function downloadUnifiedSchoolWorkbook(filename = 'plantilla_escuela_completa.xlsx') {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Grupos
  const wsGrupos = XLSX.utils.aoa_to_sheet([
    ['nombre', 'grado', 'ciclo_escolar', 'turno'],
    ['1° A', '1', '2025-2026', 'Matutino'],
    ['1° B', '1', '2025-2026', 'Matutino'],
    ['2° A', '2', '2025-2026', 'Matutino'],
    ['3° A', '3', '2025-2026', 'Matutino'],
  ]);
  wsGrupos['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsGrupos, 'Grupos');

  // Hoja 2: Materias
  const wsMaterias = XLSX.utils.aoa_to_sheet([
    ['nombre', 'grado', 'horas_semanales'],
    ['Matemáticas I', '1', '5'],
    ['Español I', '1', '5'],
    ['Ciencias I (Biología)', '1', '4'],
    ['Historia I', '1', '3'],
  ]);
  wsMaterias['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsMaterias, 'Materias');

  // Hoja 3: Docentes
  const wsDocentes = XLSX.utils.aoa_to_sheet([
    ['nombre', 'apellidos', 'correo', 'curp', 'telefono', 'especialidad'],
    ['Carlos', 'Ramírez Domínguez', 'carlos.ramirez@escuela.mx', 'RADC800101HDFRMN01', '9611234567', 'Matemáticas'],
    ['Laura', 'Mendoza Solís', 'laura.mendoza@escuela.mx', 'MESL850202MDFNLN02', '9619876543', 'Español'],
    ['Roberto', 'Gómez Vázquez', 'roberto.gomez@escuela.mx', 'GOVR780303HDFRMN03', '9615556677', 'Ciencias'],
  ]);
  wsDocentes['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsDocentes, 'Docentes');

  // Hoja 4: Alumnos
  const wsAlumnos = XLSX.utils.aoa_to_sheet([
    ['nombre', 'apellidos', 'curp', 'genero', 'fecha_nacimiento', 'grupo', 'nombre_tutor', 'telefono_tutor'],
    ['Pedro', 'Hernández Gómez', 'HEGP080512HDFRMN01', 'M', '2008-05-12', '1° A', 'Juan Hernández', '9611112233'],
    ['María', 'López Cruz', 'LOCM080720MDFNLN02', 'F', '2008-07-20', '1° A', 'Ana Cruz', '9614445566'],
    ['José', 'Pérez Morales', 'PEMJ070315HDFRMN03', 'M', '2007-03-15', '2° A', 'Carmen Morales', '9617778899'],
  ]);
  wsAlumnos['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsAlumnos, 'Alumnos');

  // Hoja 5: Asignaciones Curriculares
  const wsAsig = XLSX.utils.aoa_to_sheet([
    ['grupo', 'materia', 'docente'],
    ['1° A', 'Matemáticas I', 'carlos.ramirez@escuela.mx'],
    ['1° A', 'Español I', 'laura.mendoza@escuela.mx'],
    ['1° A', 'Ciencias I (Biología)', 'roberto.gomez@escuela.mx'],
    ['2° A', 'Matemáticas I', 'carlos.ramirez@escuela.mx'],
  ]);
  wsAsig['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsAsig, 'Asignaciones');

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename.replace(/\.csv$/, '')}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}
