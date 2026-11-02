// server/utils/email.js
// Utilidad para envío de notificaciones por correo electrónico a escuelas

async function notificarEscuelaPorCorreo({ destinatario, nombreEscuela, estado, motivoRechazo = null }) {
  const isConfigured = Boolean(
    process.env.SMTP_HOST && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS
  );

  if (!isConfigured) {
    console.log(`[NOTIFICACIÓN CORREO] Servicio SMTP no configurado. No se envió correo simulado a: ${destinatario} (${nombreEscuela} - ${estado}).`);
    return {
      sent: false,
      reason: 'Servicio de correo SMTP no configurado en variables de entorno (.env).',
    };
  }

  // Si en el futuro se configuran las variables SMTP y se instala nodemailer:
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

    const asunto = estado === 'Aprobada'
      ? `Solicitud Aprobada - SICARA (${nombreEscuela})`
      : `Resolución de Solicitud de Registro - SICARA (${nombreEscuela})`;

    const cuerpo = estado === 'Aprobada'
      ? `Estimado directivo de ${nombreEscuela}:\n\nNos complace informarle que su solicitud de incorporación al sistema SICARA ha sido APROBADA.\nYa puede acceder a la plataforma con su cuenta asignada.\n\nAtentamente,\nAdministración General de SICARA`
      : `Estimado directivo de ${nombreEscuela}:\n\nLe informamos que su solicitud de registro en SICARA ha sido RECHAZADA.\nMotivo del rechazo: ${motivoRechazo || 'No especificado'}.\n\nSi desea corregir su información, puede enviar una nueva solicitud.\n\nAtentamente,\nAdministración General de SICARA`;

    await transporter.sendMail({
      from: `"SICARA Escuelas Rurales" <${process.env.SMTP_USER}>`,
      to: destinatario,
      subject: asunto,
      text: cuerpo,
    });

    console.log(`[NOTIFICACIÓN CORREO] Correo enviado exitosamente a: ${destinatario}`);
    return { sent: true };
  } catch (error) {
    console.error('[NOTIFICACIÓN CORREO] Error al enviar correo:', error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = {
  notificarEscuelaPorCorreo,
};

