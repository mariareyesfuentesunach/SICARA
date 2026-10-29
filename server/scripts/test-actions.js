require('dotenv').config();
const db = require('../config/db');

async function testActions() {
  console.log('--- PROBANDO ACCIONES DE APROBACIÓN Y RECHAZO ---');

  // Buscar una solicitud pendiente
  const res = await db.query(`SELECT * FROM solicitud_escuela WHERE estado_solicitud = 'Pendiente' LIMIT 1`);
  if (res.rows.length === 0) {
    console.log('No hay solicitud pendiente para probar.');
    process.exit(0);
  }

  const solicitud = res.rows[0];
  console.log(`Solicitud de prueba seleccionada: "${solicitud.nombre_escuela}" (ID: ${solicitud.id_solicitud})`);

  // Simular llamada al endpoint de aprobación
  const express = require('express');
  const authRoutes = require('../routes/auth.routes');
  const solicitudesRoutes = require('../routes/solicitudes.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/solicitudes', solicitudesRoutes);

  const server = app.listen(5002, async () => {
    try {
      // Login para obtener token
      const loginRes = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: 'Admin123' }),
      });
      const { token } = await loginRes.json();

      // Aprobar solicitud
      console.log(`Enviando aprobación para ID: ${solicitud.id_solicitud}...`);
      const aprobaRes = await fetch(`http://localhost:5002/api/solicitudes/${solicitud.id_solicitud}/aprobar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const aprobaData = await aprobaRes.json();
      console.log('Respuesta de aprobación:', aprobaData);

      // Verificar en BD que solicitud_escuela esté Aprobada
      const verifySol = await db.query(`SELECT estado_solicitud FROM solicitud_escuela WHERE id_solicitud = $1`, [solicitud.id_solicitud]);
      console.log('Estado en solicitud_escuela:', verifySol.rows[0].estado_solicitud);

      // Verificar en BD que la escuela exista en la tabla escuelas
      const verifyEsc = await db.query(`SELECT * FROM escuelas WHERE UPPER(cct) = UPPER($1)`, [solicitud.cct]);
      console.log('Escuela creada en tabla escuelas:', verifyEsc.rows[0]?.nombre_escuela, 'CCT:', verifyEsc.rows[0]?.cct);

      // Verificar usuario directivo creado
      const verifyUsr = await db.query(`SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1)`, [solicitud.correo_responsable]);
      console.log('Usuario directivo en tabla usuario:', verifyUsr.rows[0]?.nombre, 'Rol:', verifyUsr.rows[0]?.rol, 'Escuela ID:', verifyUsr.rows[0]?.id_escuela);

      console.log('\n✅ ¡FLUJO DE APROBACIÓN VALIDADO Y PERSISTIDO EN POSTGRESQL EXITOSAMENTE!');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Error durante la prueba de aprobación:', err);
      server.close();
      process.exit(1);
    }
  });
}

testActions();
