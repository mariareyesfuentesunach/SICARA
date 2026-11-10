/**
 * Utilidad para procesamiento, parseo y descarga de plantillas CSV (Excel)
 * Compatible con delimitadores por coma (,) y punto y coma (;), comillas RFC-4180
 * y codificación UTF-8 con BOM (\uFEFF) para apertura nativa en Microsoft Excel en español.
 */

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
 * Parsea el contenido de un archivo de texto CSV a un arreglo de objetos.
 * Soporta saltos de línea dentro de comillas, delimitador automático (, o ;),
 * y BOM UTF-8.
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  // Quitar BOM UTF-8 si existe
  let cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detectar delimitador inspeccionando la primera línea
  const firstLine = cleanText.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  // Parser robusto carácter a carácter con soporte de comillas RFC-4180
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Comilla escapada ("") dentro de comillas
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
      // Evitar filas vacías
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Última fila si el archivo no termina en salto de línea
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const rawHeaders = rows[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  const dataRows = rows.slice(1);

  return dataRows.map((row, rowIndex) => {
    const obj = { _rowNumber: rowIndex + 2 };
    normalizedHeaders.forEach((h, colIndex) => {
      obj[h] = row[colIndex] !== undefined ? row[colIndex] : '';
    });
    obj._raw = row;
    return obj;
  });
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

