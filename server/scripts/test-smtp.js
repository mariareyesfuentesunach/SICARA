require('dotenv').config();
const { verificarConexionSMTP, notificarEscuelaPorCorreo } = require('../utils/email');

async function main() {
  console.log('====================================================');
  console.log('   SICARA — COMPROBACIÓN DEL SERVICIO DE CORREO SMTP');
  console.log('====================================================');
  console.log(`Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`Puerto: ${process.env.SMTP_PORT || '587'}`);
  console.log(`Usuario configurado: ${process.env.SMTP_USER ? 'SÍ (' + process.env.SMTP_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') + ')' : 'NO'}`);
  console.log(`Contraseña configurada: ${process.env.SMTP_PASS ? 'SÍ (longitud: ' + process.env.SMTP_PASS.length + ' chars)' : 'NO'}`);
  console.log('----------------------------------------------------');

  console.log('Probando verificación de conexión con el servidor SMTP...');
  const res = await verificarConexionSMTP();

  if (res.ok) {
    console.log('>> [ÉXITO] Conexión SMTP verificada correctamente.');
    console.log(`>> Mensaje: ${res.message}`);

    // Si se pasa un correo como argumento por terminal: node server/scripts/test-smtp.js correo@destino.com
    const testRecipient = process.argv[2];
    if (testRecipient) {
      console.log(`\nEnviando correo de prueba real a: ${testRecipient}...`);
      const sendRes = await notificarEscuelaPorCorreo({
        destinatario: testRecipient,
        nombreEscuela: 'Escuela Rural de Prueba SICARA',
        estado: 'Aprobada',
        solicitudData: {
          id_solicitud: 'TEST-0001',
          nombre_escuela: 'Escuela Rural de Prueba SICARA',
          cct: '14DPR9999K',
          nivel_educativo: 'Primaria',
          turno: 'Matutino',
          municipio: 'Tapalpa',
          direccion: 'Domicilio Conocido Ejido Centro',
          codigo_postal: '49340',
          nombre_responsable: 'Directivo de Prueba',
          correo_responsable: testRecipient,
          admin_nombre: 'Administrador General SICARA',
        },
      });

      if (sendRes.sent) {
        console.log(`>> [ÉXITO] Correo de prueba despachado satisfactoriamente. MessageID: ${sendRes.messageId}`);
      } else {
        console.error(`>> [ERROR] Falló el despacho del correo: ${sendRes.error}`);
      }
    } else {
      console.log('\n(Para realizar una prueba de envío real con adjunto PDF, ejecute:');
      console.log('node server/scripts/test-smtp.js su_correo@ejemplo.com)');
    }
  } else {
    console.error('>> [FALLO DE CONEXIÓN]');
    console.error(`>> Código: ${res.code}`);
    console.error(`>> Motivo: ${res.message}`);
  }
  console.log('====================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error inesperado en script de prueba SMTP:', err);
  process.exit(1);
});

