require('dotenv').config();
const { pool } = require('../config/db');
const { notificarEscuelaPorCorreo } = require('../utils/email');

async function sendNotification() {
  console.log('Consultando solicitud de Juan Escutia...');
  const res = await pool.query(
    "SELECT * FROM solicitud_escuela WHERE nombre_escuela ILIKE '%Juan Escutia%'"
  );

  if (res.rows.length === 0) {
    console.error('No se encontró la solicitud.');
    process.exit(1);
  }

  const sol = res.rows[0];
  const emailDest = sol.correo_responsable || sol.correo_institucional;
  console.log(`Destinatario encontrado: ${emailDest}`);
  console.log(`Plantel: ${sol.nombre_escuela}`);
  console.log(`Responsable: ${sol.nombre_responsable}`);

  console.log('Despachando correo de aprobación...');
  const result = await notificarEscuelaPorCorreo({
    destinatario: emailDest,
    nombreEscuela: sol.nombre_escuela,
    estado: 'Aprobada',
    solicitudData: {
      ...sol,
      id_solicitud: sol.id_solicitud,
      admin_nombre: 'Administración General SICARA',
    },
  });

  console.log('Resultado del envío:');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

sendNotification().catch((e) => {
  console.error('Error al despachar notificación:', e);
  process.exit(1);
});

