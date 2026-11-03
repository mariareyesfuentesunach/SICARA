const http = require('http');
const db = require('../config/db');

async function testPhase4() {
  console.log('=== TEST DE VERIFICACIÓN FASE 4: NOTIFICACIONES Y FORMULARIOS ===\n');

  // Inicializar servidor de prueba Express
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  require('dotenv').config();

  const authRoutes = require('../routes/auth.routes');
  const solicitudesRoutes = require('../routes/solicitudes.routes');
  const notificacionesRoutes = require('../routes/notificaciones.routes');
  const administradoresRoutes = require('../routes/administradores.routes');
  const dashboardRoutes = require('../routes/dashboard.routes');
  const escuelasRoutes = require('../routes/escuelas.routes');
  const usuariosRoutes = require('../routes/usuarios.routes');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/solicitudes', solicitudesRoutes);
  app.use('/api/notificaciones', notificacionesRoutes);
  app.use('/api/administradores', administradoresRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/escuelas', escuelasRoutes);
  app.use('/api/usuarios', usuariosRoutes);

  const server = app.listen(5005, async () => {
    try {
      // 1. Iniciar sesión como Administrador General
      console.log('1. Autenticando con cuenta Admin_Palasio@gmail.com...');
      const loginRes = await fetch('http://localhost:5005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: 'Admin123' }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.token) {
        throw new Error('Login fallido: ' + JSON.stringify(loginData));
      }
      const token = loginData.token;
      console.log('   ✅ Autenticado exitosamente. Token obtenido.\n');

      // 2. Probar GET /api/notificaciones
      console.log('2. Consultando bandejas de notificaciones (GET /api/notificaciones)...');
      const notifRes = await fetch('http://localhost:5005/api/notificaciones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notifData = await notifRes.json();
      if (!notifData.success) throw new Error('Error al obtener notificaciones: ' + JSON.stringify(notifData));

      console.log(`   ✅ Bandeja de Pendientes: ${notifData.totalPendientes} notificaciones.`);
      console.log(`   ✅ Bandeja de Leídas: ${notifData.totalLeidas} notificaciones.`);

      // 3. Probar marcar como leída
      if (notifData.pendientes.length > 0) {
        const itemToRead = notifData.pendientes[0];
        console.log(`\n3. Marcando notificación como leída: "${itemToRead.nombre_escuela}" (ID: ${itemToRead.id_solicitud})...`);
        
        const readRes = await fetch(`http://localhost:5005/api/notificaciones/${itemToRead.id_solicitud}/leida`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        const readData = await readRes.json();
        console.log('   Respuesta:', readData.message);

        // Verificar en BD
        const dbCheck = await db.query(
          'SELECT notificacion_leida, fecha_leida FROM solicitud_escuela WHERE id_solicitud = $1',
          [itemToRead.id_solicitud]
        );
        console.log('   Persistencia en PostgreSQL:', dbCheck.rows[0]);
        if (!dbCheck.rows[0].notificacion_leida) throw new Error('Fallo al persistir notificacion_leida = true en BD');
        console.log('   ✅ Notificación persistida en la bandeja de leídas.');

        // 4. Probar mover de regreso a pendientes
        console.log(`\n4. Moviendo notificación de regreso a pendientes: "${itemToRead.nombre_escuela}"...`);
        const pendRes = await fetch(`http://localhost:5005/api/notificaciones/${itemToRead.id_solicitud}/pendiente`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        const pendData = await pendRes.json();
        console.log('   Respuesta:', pendData.message);

        const dbCheck2 = await db.query(
          'SELECT notificacion_leida, fecha_leida FROM solicitud_escuela WHERE id_solicitud = $1',
          [itemToRead.id_solicitud]
        );
        console.log('   Persistencia en PostgreSQL:', dbCheck2.rows[0]);
        if (dbCheck2.rows[0].notificacion_leida !== false) throw new Error('Fallo al persistir notificacion_leida = false en BD');
        console.log('   ✅ Notificación regresada a la bandeja de pendientes.');
      }

      // 5. Probar que una nueva solicitud crea una notificación en la bandeja de pendientes
      console.log('\n5. Registrando nueva solicitud de escuela para verificar generación automática de notificación...');
      const testCCT = '14EPR' + Math.floor(1000 + Math.random() * 9000) + 'X';
      const newSolRes = await fetch('http://localhost:5005/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Primaria Rural Notificaciones Test',
          cct: testCCT,
          nivel_educativo: 'Primaria',
          turno: 'Matutino',
          municipio: 'Tapalpa',
          estado: 'Jalisco',
          nombre_responsable: 'Profr. Notif Tester',
          correo_responsable: `test.notif.${Date.now()}@rural.edu.mx`,
        }),
      });
      const newSolData = await newSolRes.json();
      console.log('   Solicitud registrada:', newSolData.message, 'ID:', newSolData.solicitud?.id_solicitud);

      // Verificar que aparezca en pendientes
      const verifyNotif = await fetch('http://localhost:5005/api/notificaciones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const verifyNotifData = await verifyNotif.json();
      const foundNew = verifyNotifData.pendientes.find(p => p.id_solicitud === newSolData.solicitud.id_solicitud);
      if (!foundNew) throw new Error('La nueva solicitud no apareció en la bandeja de notificaciones pendientes');
      console.log(`   ✅ La notificación de "${foundNew.nombre_escuela}" apareció de forma inmediata en la bandeja de pendientes.`);

      console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FASE 4 PASARON SATISFACTORIAMENTE!');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Error en pruebas:', err);
      server.close();
      process.exit(1);
    }
  });
}

testPhase4();

