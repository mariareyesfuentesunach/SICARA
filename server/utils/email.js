// server/utils/email.js
// Utilidad para generación de comprobantes PDF, despacho de notificaciones y verificación SMTP

const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

/**
 * Crea y retorna el transporte de Nodemailer configurado con STARTTLS para Gmail u otros SMTP.
 */
function crearTransporteSMTP() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure, // false para 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Compatibilidad con redes locales / certificados
    },
  });
}

/**
 * Comprueba el estado de la conexión SMTP y valida credenciales sin exponer contraseñas.
 * @returns {Promise<{ ok: boolean, code: string, message: string, configured: boolean, user?: string }>}
 */
async function verificarConexionSMTP() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT || '587';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return {
      ok: false,
      code: 'MISSING_CREDENTIALS',
      message: 'Faltan credenciales SMTP (SMTP_USER o SMTP_PASS no definidas en el archivo .env).',
      configured: false,
    };
  }

  try {
    const transporter = crearTransporteSMTP();
    await transporter.verify();
    return {
      ok: true,
      code: 'CONNECTED',
      message: `Conexión SMTP establecida exitosamente con ${host}:${port}. Servicio listo para enviar correos.`,
      configured: true,
      user: user.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Correo ofuscado para seguridad
    };
  } catch (error) {
    let msg = error.message;
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      msg = 'Credenciales de Google SMTP incorrectas. Asegúrese de utilizar una "Contraseña de aplicación" generada de 16 caracteres y no la contraseña habitual de la cuenta.';
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      msg = `No se pudo conectar con el servidor SMTP (${host}:${port}). Verifique su conexión de red o cortafuegos.`;
    }
    return {
      ok: false,
      code: error.code || 'SMTP_ERROR',
      message: msg,
      configured: true,
    };
  }
}

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

      // 5. Bloque de Datos del Directivo
      const directivoY = 375;
      doc.rect(45, directivoY, 522, 90).fillAndStroke('#FBF9F9', '#E5D7D9');

      doc.fillColor(vinoPrimary)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('DIRECTIVO / RESPONSABLE DESIGNADO', 55, directivoY + 10);

      doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold');
      doc.text('Nombre del Responsable:', 55, directivoY + 30);
      doc.font('Helvetica').text(data.nombre_responsable || 'N/A', 190, directivoY + 30);

      doc.font('Helvetica-Bold').text('Correo Electrónico (Acceso):', 55, directivoY + 46);
      doc.font('Helvetica').text(data.correo_responsable || 'N/A', 190, directivoY + 46);

      doc.font('Helvetica-Bold').text('Estado en Plataforma:', 55, directivoY + 62);
      doc.fillColor('#1E7E34').font('Helvetica-Bold').text('ACTIVO (Rol Directivo Habilitado)', 190, directivoY + 62);

      // 6. Sello y firmas
      const footerY = 530;
      doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(80, footerY).lineTo(250, footerY).stroke();
      doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(360, footerY).lineTo(530, footerY).stroke();

      doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold');
      doc.text(data.admin_nombre || 'Administración General', 80, footerY + 8, { width: 170, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('Autorización y Certificación', 80, footerY + 22, { width: 170, align: 'center' });

      doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold');
      doc.text(data.nombre_responsable || 'Dirección del Plantel', 360, footerY + 8, { width: 170, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('Recepción y Compromiso Escolar', 360, footerY + 22, { width: 170, align: 'center' });

      // 7. Pie institucional
      doc.fontSize(8)
         .fillColor('#888888')
         .text('Este documento digital cuenta con validez interna dentro de la infraestructura SICARA. Generado de forma automatizada.', 45, 680, { align: 'center', width: 522 });

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
    const transporter = crearTransporteSMTP();

    let attachments = [];
    let asunto = '';
    let cuerpoTexto = '';
    let cuerpoHtml = '';

    const nombreResp = (solicitudData && (solicitudData.nombre_responsable || solicitudData.nombre)) || 'Directivo(a)';
    const nombreEsc = nombreEscuela || (solicitudData && solicitudData.nombre_escuela) || 'la institución educativa';

    // Generar enlace de activación si se cuenta con token
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const enlaceActivacion = solicitudData.token_activacion
      ? `${clientBaseUrl}/?activacion=${encodeURIComponent(solicitudData.token_activacion)}`
      : null;

    if (estado === 'Aprobada') {
      asunto = 'Solicitud de registro de escuela aprobada - SICARA';
      
      const urlCrearPassword = enlaceActivacion || `${clientBaseUrl}/?activacion=solicitar&correo=${encodeURIComponent(cleanDest)}`;
      const urlIniciarSesion = `${clientBaseUrl}/?login=true&correo=${encodeURIComponent(cleanDest)}`;
      const urlRestablecerPassword = `${clientBaseUrl}/?recuperar=solicitar&correo=${encodeURIComponent(cleanDest)}`;

      cuerpoTexto = `Hola, ${nombreResp}.\n\n` +
        `Nos complace informarle que la solicitud de registro de la escuela ${nombreEsc} en SICARA ha sido aprobada correctamente.\n\n` +
        `A partir de este momento, la escuela se encuentra registrada en la plataforma.\n\n` +
        `OPCIÓN 1. ¿El Administrador General registró tu escuela y todavía no tienes una contraseña?\n` +
        `Si el Administrador General realizó el registro de tu escuela, podrás crear tu contraseña personal y segura para acceder por primera vez a SICARA.\n` +
        `CREAR MI CONTRASEÑA:\n${urlCrearPassword}\n\n` +
        `OPCIÓN 2. ¿Realizaste personalmente tu solicitud y ya registraste una contraseña?\n` +
        `Si durante tu solicitud proporcionaste tu correo electrónico y contraseña, puedes ingresar directamente a SICARA. No necesitas crear otra contraseña.\n` +
        `INICIAR SESIÓN EN SICARA:\n${urlIniciarSesion}\n\n` +
        `OPCIÓN 3. ¿Ya tenías una contraseña, pero la olvidaste?\n` +
        `Si no recuerdas tu contraseña, puedes recuperar el acceso a tu cuenta. Ingresa tu correo electrónico y recibirás un enlace seguro para establecer una nueva contraseña.\n` +
        `RESTABLECER MI CONTRASEÑA:\n${urlRestablecerPassword}\n\n` +
        `Gracias por formar parte de SICARA.\n\n` +
        `Sistema SICARA\n` +
        `Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales.`;

      cuerpoHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${asunto}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F5F5; margin: 0; padding: 24px; color: #292329; }
          .container { max-width: 620px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E8E2E4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
          .header { background: linear-gradient(135deg, #4A1722, #722F37); padding: 32px 28px; text-align: center; color: #FFFFFF; }
          .badge { display: inline-block; background-color: #E8F5E9; color: #1B5E20; padding: 6px 16px; border-radius: 999px; font-weight: 700; font-size: 13px; text-transform: uppercase; margin-top: 12px; border: 1px solid #C8E6C9; letter-spacing: 0.5px; }
          .content { padding: 32px 28px; font-size: 15px; line-height: 1.6; color: #292329; }
          .school-card { background: #FAF7F8; border-left: 4px solid #722F37; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .school-title { font-weight: 700; color: #4A1722; font-size: 16px; margin: 0 0 6px 0; }
          .footer { background: #F8F5F5; padding: 20px 28px; text-align: center; font-size: 12px; color: #685D68; border-top: 1px solid #E8E2E4; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">SICARA</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Escuelas Rurales</p>
            <div class="badge">✓ APROBADA</div>
          </div>
          <div class="content">
            <p>Hola, <strong>${nombreResp}</strong>.</p>
            <p>Nos complace informarle que la solicitud de registro de la escuela <strong>${nombreEsc}</strong> en SICARA ha sido aprobada correctamente.</p>
            
            <div class="school-card">
              <p class="school-title">${nombreEsc}</p>
              <p style="margin: 0; font-size: 13px; color: #555;"><strong>Clave CCT:</strong> ${solicitudData.cct || 'N/A'}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #555;"><strong>Nivel y Turno:</strong> ${solicitudData.nivel_educativo || 'Primaria'} (${solicitudData.turno || 'Matutino'})</p>
            </div>

            <p>A partir de este momento, la escuela se encuentra registrada en la plataforma.</p>

            <!-- OPCIÓN 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; background-color: #FAF7F8; border: 1px solid #E8E2E4; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 22px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #4A1722; line-height: 1.4;">
                    OPCIÓN 1. ¿El Administrador General registró tu escuela y todavía no tienes una contraseña?
                  </h3>
                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #555555; line-height: 1.5;">
                    Si el Administrador General realizó el registro de tu escuela, podrás crear tu contraseña personal y segura para acceder por primera vez a SICARA.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                          <tr>
                            <td align="center" style="background-color: #722F37; border-radius: 8px;">
                              <a href="${urlCrearPassword}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: bold; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px;">
                                CREAR MI CONTRASEÑA
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- OPCIÓN 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; background-color: #FAF7F8; border: 1px solid #E8E2E4; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 22px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #4A1722; line-height: 1.4;">
                    OPCIÓN 2. ¿Realizaste personalmente tu solicitud y ya registraste una contraseña?
                  </h3>
                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #555555; line-height: 1.5;">
                    Si durante tu solicitud proporcionaste tu correo electrónico y contraseña, puedes ingresar directamente a SICARA. No necesitas crear otra contraseña.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                          <tr>
                            <td align="center" style="background-color: #4A1722; border-radius: 8px;">
                              <a href="${urlIniciarSesion}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: bold; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px;">
                                INICIAR SESIÓN EN SICARA
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- OPCIÓN 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; background-color: #FAF7F8; border: 1px solid #E8E2E4; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 22px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #4A1722; line-height: 1.4;">
                    OPCIÓN 3. ¿Ya tenías una contraseña, pero la olvidaste?
                  </h3>
                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #555555; line-height: 1.5;">
                    Si no recuerdas tu contraseña, puedes recuperar el acceso a tu cuenta. Ingresa tu correo electrónico y recibirás un enlace seguro para establecer una nueva contraseña.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                          <tr>
                            <td align="center" style="background-color: #A64D5A; border-radius: 8px;">
                              <a href="${urlRestablecerPassword}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: bold; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px;">
                                RESTABLECER MI CONTRASEÑA
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin-top: 24px;">Gracias por formar parte de SICARA.</p>
            
            <p style="margin-top: 32px; border-top: 1px solid #E8E2E4; padding-top: 16px;">
              <strong>Sistema SICARA</strong><br>
              <span style="font-size: 13px; color: #685D68;">Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales.</span>
            </p>
          </div>
          <div class="footer">
            Este es un correo oficial generado automáticamente por la plataforma SICARA.
          </div>
        </div>
      </body>
      </html>
      `;

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
        console.warn('[NOTIFICACIÓN CORREO] Aviso: No se pudo generar el PDF adjunto, se envía correo estándar:', pdfErr.message);
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

    const fromAddress = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"SICARA Administración" <${process.env.SMTP_USER}>` : undefined);

    const mailOptions = {
      from: fromAddress,
      to: cleanDest,
      subject: asunto,
      text: cuerpoTexto,
      attachments,
    };

    if (cuerpoHtml) {
      mailOptions.html = cuerpoHtml;
    }

    const info = await transporter.sendMail(mailOptions);

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

/**
 * Envía correo electrónico con enlace seguro para restablecer contraseña.
 * Utiliza plantilla con colores institucionales (#A64D5A) y botón centrado compatible con clientes de correo.
 */
async function enviarCorreoRecuperacion({ destinatario, nombreUsuario, token }) {
  const isConfigured = Boolean(
    process.env.SMTP_HOST && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS
  );

  const cleanDest = (destinatario || '').trim().toLowerCase();
  if (!cleanDest) {
    return { sent: false, error: 'Correo de destinatario no válido.' };
  }

  if (!isConfigured) {
    console.log(`[RECUPERACIÓN CORREO] Servicio SMTP no configurado. Token para ${cleanDest}: ${token}`);
    return { sent: false, error: 'Servicio SMTP no configurado en variables de entorno.' };
  }

  try {
    const transporter = crearTransporteSMTP();
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const enlaceRecuperacion = `${clientBaseUrl}/?recuperar=${encodeURIComponent(token)}`;
    const nombre = nombreUsuario || 'Usuario';
    const asunto = 'Restablecer contraseña de acceso - SICARA';

    const cuerpoTexto = `Hola, ${nombre}.\n\n` +
      `Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta en SICARA.\n\n` +
      `Para establecer tu nueva contraseña de forma segura, haz clic en el siguiente enlace:\n` +
      `${enlaceRecuperacion}\n\n` +
      `Este enlace es seguro, de un solo uso y tiene una vigencia de 2 horas.\n\n` +
      `Si tú no solicitaste este cambio, puedes ignorar este mensaje; tu contraseña actual no será modificada.\n\n` +
      `Sistema SICARA\n` +
      `Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales.`;

    const cuerpoHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${asunto}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F5F5; margin: 0; padding: 24px; color: #292329; }
        .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E8E2E4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #4A1722, #722F37); padding: 32px 28px; text-align: center; color: #FFFFFF; }
        .badge { display: inline-block; background-color: #FFF3E0; color: #E65100; padding: 6px 16px; border-radius: 999px; font-weight: 700; font-size: 13px; text-transform: uppercase; margin-top: 12px; border: 1px solid #FFE0B2; letter-spacing: 0.5px; }
        .content { padding: 32px 28px; font-size: 15px; line-height: 1.6; color: #292329; }
        .footer { background: #F8F5F5; padding: 20px 28px; text-align: center; font-size: 12px; color: #685D68; border-top: 1px solid #E8E2E4; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">SICARA</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Escuelas Rurales</p>
          <div class="badge">SEGURIDAD DE ACCESO</div>
        </div>
        <div class="content">
          <p>Hola, <strong>${nombre}</strong>.</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta en <strong>SICARA</strong>.</p>
          <p>Para establecer una nueva contraseña segura, presiona el siguiente botón:</p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" style="background-color: #A64D5A; border-radius: 8px;">
                      <a href="${enlaceRecuperacion}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: bold; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px;">
                        RESTABLECER MI CONTRASEÑA
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="background-color: #FAF7F8; border-left: 4px solid #A64D5A; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #555;">
            <p style="margin: 0;"><strong>Aviso de seguridad:</strong> Este enlace es personal, seguro y tiene una vigencia de <strong>2 horas</strong>.</p>
            <p style="margin: 6px 0 0 0;">Si no solicitaste este cambio de contraseña, puedes ignorar este correo; tu cuenta continuará protegida y no se realizará ninguna modificación.</p>
          </div>

          <p style="margin-top: 28px; border-top: 1px solid #E8E2E4; padding-top: 16px;">
            <strong>Sistema SICARA</strong><br>
            <span style="font-size: 13px; color: #685D68;">Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales.</span>
          </p>
        </div>
        <div class="footer">
          Este es un correo oficial generado automáticamente por la plataforma SICARA.
        </div>
      </div>
    </body>
    </html>
    `;

    const fromAddress = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"SICARA Administración" <${process.env.SMTP_USER}>` : undefined);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: cleanDest,
      subject: asunto,
      text: cuerpoTexto,
      html: cuerpoHtml,
    });

    console.log(`[RECUPERACIÓN CORREO] Correo de restablecimiento enviado a: ${cleanDest}. MessageID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[RECUPERACIÓN CORREO] Error al despachar correo:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  crearTransporteSMTP,
  verificarConexionSMTP,
  generarComprobantePDF,
  notificarEscuelaPorCorreo,
  enviarCorreoRecuperacion,
};
