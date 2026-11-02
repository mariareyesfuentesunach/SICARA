// server/utils/email.js
// Utilidad para generación de comprobantes PDF y despacho de notificaciones por correo electrónico

const PDFDocument = require('pdfkit');

/**
 * Genera en memoria un comprobante formal de incorporación escolar en formato PDF.
 * @param {Object} data Datos reales de la solicitud y resolución
 * @returns {Promise<Buffer>} Buffer del documento PDF generado
 */
function generarComprobantePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Colores institucionales
      const vinoDark = '#4A1722';
      const vinoPrimary = '#722F37';
      const textDark = '#292329';
      const textMuted = '#666666';

      // 1. Encabezado institucional
      doc.rect(45, 40, 522, 65).fill(vinoPrimary);
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('SICARA — GOBIERNO ESCOLAR RURAL', 60, 52);
      
      doc.fontSize(9)
         .font('Helvetica')
         .text('Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales', 60, 75);
      
      doc.fontSize(8)
         .fillColor('#F2D6D9')
         .text('MÓDULO DEL ADMINISTRADOR GENERAL | COMPROBANTE OFICIAL DE INCORPORACIÓN', 60, 88);

      // 2. Título del Documento
      doc.moveDown(3);
      doc.fillColor(vinoDark)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('DICTAMEN DE APROBACIÓN DE PLANTEL EDUCATIVO', 45, 125, { align: 'center' });

      doc.fillColor(textMuted)
         .fontSize(9)
         .font('Helvetica')
         .text(`Folio Oficial: ${data.id_solicitud || 'S/N'}   |   Fecha de Emisión: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

      doc.moveDown(1.5);

      // Línea divisoria
      doc.strokeColor(vinoPrimary).lineWidth(1.5).moveTo(45, 160).lineTo(567, 160).stroke();

      // 3. Declaración formal
      doc.moveDown(1);
      doc.fillColor(textDark)
         .fontSize(10)
         .font('Helvetica')
         .text(
           `Por medio de la presente, la Administración General del Sistema SICARA hace constar que la solicitud de registro presentada por la institución educativa que a continuación se detalla ha sido evaluada satisfactoriamente y APROBADA para su incorporación oficial al catálogo del sistema.`,
           45,
           175,
           { align: 'justify', lineGap: 3 }
         );

      // 4. Bloque de Datos del Plantel
      doc.moveDown(1.5);
      const startY = 230;
      doc.rect(45, startY, 522, 130).fillAndStroke('#FBF9F9', '#E5D7D9');

      doc.fillColor(vinoPrimary)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('DATOS DEL PLANTEL RURAL REGISTRADO', 55, startY + 10);

      doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold');
      doc.text('Nombre de la Escuela:', 55, startY + 30);
      doc.font('Helvetica').text(data.nombre_escuela || 'N/A', 175, startY + 30);

      doc.font('Helvetica-Bold').text('Clave CCT:', 55, startY + 46);
      doc.font('Helvetica').text(data.cct || 'N/A', 175, startY + 46);

      doc.font('Helvetica-Bold').text('Nivel y Turno:', 55, startY + 62);
      doc.font('Helvetica').text(`${data.nivel_educativo || 'Primaria'} (${data.turno || 'Matutino'})`, 175, startY + 62);

      doc.font('Helvetica-Bold').text('Ubicación / Comunidad:', 55, startY + 78);
      doc.font('Helvetica').text(`${data.direccion || 'Domicilio Conocido'}, ${data.municipio || 'Jalisco'}`, 175, startY + 78);

      doc.font('Helvetica-Bold').text('Código Postal:', 55, startY + 94);
      doc.font('Helvetica').text(data.codigo_postal || 'N/A', 175, startY + 94);

      doc.font('Helvetica-Bold').text('Teléfono / Contacto:', 55, startY + 110);
      doc.font('Helvetica').text(data.telefono || data.correo_institucional || 'N/A', 175, startY + 110);

      // 5. Bloque de Responsable y Resolución
      const resY = startY + 145;
      doc.rect(45, resY, 522, 100).fillAndStroke('#FBF9F9', '#E5D7D9');

      doc.fillColor(vinoPrimary)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('DATOS DE LA DIRECTIVA Y RESOLUCIÓN ADMINISTRATIVA', 55, resY + 10);

      doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold');
      doc.text('Directivo Responsable:', 55, resY + 30);
      doc.font('Helvetica').text(data.nombre_responsable || 'Directivo Responsable', 175, resY + 30);

      doc.font('Helvetica-Bold').text('Correo Electrónico:', 55, resY + 46);
      doc.font('Helvetica').text(data.correo_responsable || 'N/A', 175, resY + 46);

      doc.font('Helvetica-Bold').text('Resolución:', 55, resY + 62);
      doc.font('Helvetica-Bold').fillColor('#16A34A').text('INCORPORACIÓN AUTORIZADA (ACTIVA)', 175, resY + 62);

      doc.fillColor(textDark).font('Helvetica-Bold').text('Administrador Responsable:', 55, resY + 78);
      doc.font('Helvetica').text(data.admin_nombre || 'Administrador General SICARA', 175, resY + 78);

      // 6. Sello y firmas
      const footerY = 530;
      doc.rect(190, footerY, 230, 60).stroke('#BCA2A6');
      doc.fillColor(vinoDark)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('SELLO DIGITAL DE CERTIFICACIÓN', 190, footerY + 10, { width: 230, align: 'center' });
      doc.fontSize(7)
         .font('Courier')
         .fillColor(textMuted)
         .text(`CERT-${Date.now().toString(16).toUpperCase()}-SICARA-GOB`, 190, footerY + 28, { width: 230, align: 'center' });
      doc.fontSize(7)
         .font('Helvetica')
         .text('Válido en la plataforma institucional SICARA', 190, footerY + 42, { width: 230, align: 'center' });

      // 7. Pie de página
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(textMuted)
         .text(
           'SICARA © 2026 — Plataforma Integral de Control y Seguimiento Académico en Comunidades Rurales.\nEste documento es un comprobante digital generado automáticamente por el sistema.',
           45,
           650,
           { align: 'center', lineGap: 2 }
         );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Notifica a la escuela solicitante por correo electrónico cuando su solicitud es resuelta.
 * Si SMTP está configurado, despacha el correo (con PDF adjunto si es aprobación).
 * Si SMTP no está configurado, devuelve el estado sin simular envíos falsos.
 */
async function notificarEscuelaPorCorreo({ destinatario, nombreEscuela, estado, motivoRechazo = null, solicitudData = {} }) {
  const isConfigured = Boolean(
    process.env.SMTP_HOST && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS
  );

  // Validar formato del correo receptor
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!destinatario || !emailRegex.test(destinatario.trim())) {
    return {
      sent: false,
      error: 'La dirección de correo electrónico del destinatario no es válida o está ausente.',
    };
  }

  const cleanDest = destinatario.trim().toLowerCase();

  if (!isConfigured) {
    console.log(`[NOTIFICACIÓN CORREO] Servicio SMTP no configurado en .env. No se envía correo simulado a: ${cleanDest} (${nombreEscuela} - ${estado}).`);
    return {
      sent: false,
      error: 'Servicio de correo SMTP no configurado en variables de entorno (.env).',
    };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let attachments = [];
    let asunto = '';
    let cuerpoTexto = '';

    if (estado === 'Aprobada') {
      asunto = `Solicitud Aprobada - SICARA (${nombreEscuela})`;
      cuerpoTexto = `Estimado(a) directivo(a) de ${nombreEscuela}:\n\n` +
        `Nos complace informarle que la solicitud de registro e incorporación al Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales (SICARA) ha sido APROBADA satisfactoriamente.\n\n` +
        `Detalles de la resolución:\n` +
        `• Plantel: ${nombreEscuela}\n` +
        `• Clave CCT: ${solicitudData.cct || 'N/A'}\n` +
        `• Nivel: ${solicitudData.nivel_educativo || 'Primaria'}\n` +
        `• Turno: ${solicitudData.turno || 'Matutino'}\n` +
        `• Municipio: ${solicitudData.municipio || 'Jalisco'}\n\n` +
        `Se adjunta a este correo su Comprobante Oficial de Incorporación en formato PDF.\n` +
        `Ya puede acceder al sistema con las credenciales registradas para su directiva.\n\n` +
        `Atentamente,\n` +
        `Administración General de SICARA\n` +
        `Educación y Futuro para las Comunidades Rurales`;

      try {
        const pdfBuffer = await generarComprobantePDF({
          ...solicitudData,
          nombre_escuela: nombreEscuela,
        });
        attachments.push({
          filename: `Comprobante_Aprobacion_${(solicitudData.cct || 'SICARA').toUpperCase()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      } catch (pdfErr) {
        console.warn('[NOTIFICACIÓN CORREO] Aviso: No se pudo generar el PDF adjunto, se envía correo en texto plano:', pdfErr.message);
      }
    } else {
      asunto = `Resolución de Solicitud de Incorporación - SICARA (${nombreEscuela})`;
      cuerpoTexto = `Estimado(a) directivo(a) de ${nombreEscuela}:\n\n` +
        `Le informamos que tras la revisión de los datos proporcionados, la solicitud de registro para el plantel ${nombreEscuela} ha sido RECHAZADA.\n\n` +
        `Motivo justificado del rechazo:\n` +
        `"${motivoRechazo || 'Documentación o datos no verificados'}"\n\n` +
        `Si considera que se trata de un error o desea corregir la información solicitada, puede comunicarse con el soporte del sistema o ingresar una nueva solicitud debidamente actualizada.\n\n` +
        `Atentamente,\n` +
        `Administración General de SICARA\n` +
        `Control Escolar en Comunidades Rurales`;
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SICARA Administración" <${process.env.SMTP_USER}>`,
      to: cleanDest,
      subject: asunto,
      text: cuerpoTexto,
      attachments,
    });

    console.log(`[NOTIFICACIÓN CORREO] Correo enviado exitosamente a: ${cleanDest}. MessageID: ${info.messageId}`);
    return {
      sent: true,
      messageId: info.messageId,
      hasPdf: attachments.length > 0,
    };
  } catch (err) {
    console.error('[NOTIFICACIÓN CORREO] Error al despachar correo:', err.message);
    return {
      sent: false,
      error: err.message,
    };
  }
}

module.exports = {
  generarComprobantePDF,
  notificarEscuelaPorCorreo,
};
