import React, { useState, useRef } from 'react';
import { parseCSV, downloadCSVTemplate } from '../../utils/csvParser';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

/**
 * Componente reutilizable para importación masiva por archivo CSV (Excel)
 * Incluye descarga de plantilla oficial, dropzone de arrastrar/seleccionar,
 * visualización previa en tabla y resumen de importación.
 */
export default function CsvImportSection({
  title,
  templateFilename,
  templateHeaders,
  sampleRows,
  columnGuide = [],
  onImportBatch,
  onSuccess,
  primaryColor = '#722F37',
}) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleDownloadTemplate = () => {
    downloadCSVTemplate(templateFilename, templateHeaders, sampleRows);
  };

  const handleFileProcess = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
      setParseError('Por favor seleccione un archivo con formato .CSV (valores separados por coma o punto y coma de Excel).');
      return;
    }

    setParseError('');
    setImportResult(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setParseError('El archivo CSV está vacío o no contiene filas de datos después de la cabecera.');
          setParsedData([]);
        } else {
          setParsedData(rows);
        }
      } catch (err) {
        setParseError(`Error al procesar el archivo: ${err.message}`);
        setParsedData([]);
      }
    };
    reader.onerror = () => {
      setParseError('No fue posible leer el archivo seleccionado.');
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setParseError('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0 || importing) return;
    setImporting(true);
    setParseError('');

    try {
      const res = await onImportBatch(parsedData);
      setImportResult(res);
      if (res.success && res.creados > 0) {
        if (onSuccess) onSuccess(res);
      }
    } catch (err) {
      setParseError(err.message || 'Error de conexión al importar los registros.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Barra de ayuda y descarga de plantilla */}
      <div className="p-3.5 bg-gradient-to-r from-vino-soft/40 to-white rounded-card border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-vino-primary text-white shrink-0 mt-0.5">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-app-text text-xs">Plantilla oficial para Excel (.CSV)</h4>
            <p className="text-[11px] text-app-muted leading-relaxed">
              Descargue el archivo de ejemplo para llenarlo con sus datos en Microsoft Excel o Google Sheets.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-subtle bg-white border border-vino-primary text-vino-primary hover:bg-vino-soft text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar Plantilla</span>
        </button>
      </div>

      {/* Guía de columnas requeridas */}
      {columnGuide.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-card border border-app-border text-[11px] space-y-1.5">
          <span className="font-bold text-app-text block">Columnas reconocidas en el archivo:</span>
          <div className="flex flex-wrap gap-1.5">
            {columnGuide.map((col, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  col.required
                    ? 'bg-vino-soft text-vino-dark border-vino-light/50 font-bold'
                    : 'bg-white text-app-text border-app-border'
                }`}
              >
                {col.name} {col.required && <span className="text-status-error">*</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Selector / Dropzone de archivo */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-app-border hover:border-vino-primary bg-white hover:bg-vino-soft/10 rounded-card p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, text/csv, text/plain"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
            }}
          />
          <div className="p-3 rounded-full bg-vino-soft text-vino-primary">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="font-bold text-app-text text-xs">
            Haga clic para seleccionar o arrastre su archivo CSV aquí
          </p>
          <p className="text-[11px] text-app-muted">
            Formatos soportados: CSV con separación por coma (,) o punto y coma (;)
          </p>
        </div>
      ) : (
        <div className="p-3 bg-white rounded-card border border-app-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-green-50 text-green-700 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-app-text truncate text-xs">{file.name}</p>
              <p className="text-[11px] text-app-muted">
                {(file.size / 1024).toFixed(1)} KB • {parsedData.length} registro(s) detectado(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={importing}
            className="p-1.5 rounded-subtle hover:bg-gray-100 text-app-muted hover:text-red-600 transition-colors cursor-pointer"
            title="Seleccionar otro archivo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Errores de lectura */}
      {parseError && (
        <div className="p-3 rounded-subtle bg-status-error-bg border border-red-200 text-status-error text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Resumen del resultado de importación */}
      {importResult && (
        <div
          className={`p-3.5 rounded-card border text-[11px] space-y-2 ${
            importResult.errores?.length > 0 && importResult.creados === 0
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-green-50 border-green-200 text-green-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-xs">
            {importResult.creados > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{importResult.message}</span>
          </div>

          {importResult.errores && importResult.errores.length > 0 && (
            <div className="mt-2 pt-2 border-t border-red-200/60 max-h-32 overflow-y-auto space-y-1 text-[10px]">
              <p className="font-bold text-red-800">Filas que no se pudieron procesar:</p>
              {importResult.errores.map((err, i) => (
                <div key={i} className="text-red-700">
                  • <strong>Fila {err.fila}:</strong> {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vista previa en tabla de los registros parseados */}
      {parsedData.length > 0 && !importResult && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-app-text">
              Vista previa (Primeros {Math.min(parsedData.length, 5)} de {parsedData.length} registros)
            </span>
            <span className="text-app-muted">Verifique que las columnas coincidan</span>
          </div>

          <div className="overflow-x-auto border border-app-border rounded-card bg-white max-h-48">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-gray-50 border-b border-app-border text-app-muted uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-1.5 px-2.5 w-10">#</th>
                  {Object.keys(parsedData[0] || {})
                    .filter((k) => !k.startsWith('_'))
                    .map((k) => (
                      <th key={k} className="py-1.5 px-2.5 whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {parsedData.slice(0, 5).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/50">
                    <td className="py-1 px-2.5 font-mono text-[10px] text-app-muted">{row._rowNumber}</td>
                    {Object.keys(row)
                      .filter((k) => !k.startsWith('_'))
                      .map((k, cIdx) => (
                        <td key={cIdx} className="py-1 px-2.5 whitespace-nowrap text-app-text">
                          {String(row[k] || '')}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botón de ejecución de importación */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing}
              style={{ backgroundColor: primaryColor }}
              className="px-5 py-2 rounded-subtle text-white font-bold text-xs shadow-sm hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{importing ? 'Importando registros...' : `Importar ${parsedData.length} Registros`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

