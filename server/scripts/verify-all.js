const http = require('http');
const db = require('../config/db');

async function runVerifications() {
  console.log('=== VERIFICACIÓN INTEGRAL DE AJUSTES SICARA ===\n');

  const express = require('express');
  const cors = require('cors');
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

  const server = app.listen(5006, async () => {
    try {
      // 1. Autenticación como Admin General
      console.log('1. Autenticación como Administrador General...');
      const loginRes = await fetch('http://localhost:5006/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: 'Admin123' }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.token) {
        throw new Error('Fallo al iniciar sesión: ' + JSON.stringify(loginData));
      }
      const token = loginData.token;
      console.log('   ✅ Autenticación exitosa.\n');

      // 2. Verificar filtrado de Solicitudes desde backend (Dashboard navigation compatibility)
      console.log('2. Verificando consultas de solicitudes por estado (compatibilidad con tarjetas Dashboard)...');
      
      const resAprobadas = await fetch('http://localhost:5006/api/solicitudes?estado=Aprobada', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataAprobadas = await resAprobadas.json();
      const allAprobadas = dataAprobadas.solicitudes.every(s => s.estado_solicitud === 'Aprobada');
      console.log(`   - Filtro Aprobada: ${dataAprobadas.total} solicitudes obtenidas. ¿Todas Aprobada?: ${allAprobadas}`);
      if (!allAprobadas && dataAprobadas.total > 0) throw new Error('El filtro Aprobada devolvió otros estados');

      const resPendientes = await fetch('http://localhost:5006/api/solicitudes?estado=Pendiente', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataPendientes = await resPendientes.json();
      const allPendientes = dataPendientes.solicitudes.every(s => s.estado_solicitud === 'Pendiente');
      console.log(`   - Filtro Pendiente: ${dataPendientes.total} solicitudes obtenidas. ¿Todas Pendiente?: ${allPendientes}`);
      if (!allPendientes && dataPendientes.total > 0) throw new Error('El filtro Pendiente devolvió otros estados');

      const resRechazadas = await fetch('http://localhost:5006/api/solicitudes?estado=Rechazada', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataRechazadas = await resRechazadas.json();
      const allRechazadas = dataRechazadas.solicitudes.every(s => s.estado_solicitud === 'Rechazada');
      console.log(`   - Filtro Rechazada: ${dataRechazadas.total} solicitudes obtenidas. ¿Todas Rechazada?: ${allRechazadas}`);
      if (!allRechazadas && dataRechazadas.total > 0) throw new Error('El filtro Rechazada devolvió otros estados');

      const resTodas = await fetch('http://localhost:5006/api/solicitudes?estado=todas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataTodas = await resTodas.json();
      console.log(`   - Filtro Todas (listado general): ${dataTodas.total} solicitudes totales en PostgreSQL.\n`);

      // 3. Crear solicitud de prueba para probar APROBACIÓN y cambio automático de notificación a LEÍDA
      console.log('3. Creando solicitud para prueba de APROBACIÓN automática de notificación...');
      const randomCct1 = '14EPR' + Math.floor(1000 + Math.random() * 9000) + 'A';
      const createSol1 = await fetch('http://localhost:5006/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Escuela Rural Para Prueba Aprobacion',
          cct: randomCct1,
          nivel_educativo: 'Primaria',
          turno: 'Matutino',
          municipio: 'Mazamitla',
          estado: 'Jalisco',
          nombre_responsable: 'Director Prueba Uno',
          correo_responsable: `directivo.${Date.now()}@rural.gob.mx`
        })
      });
      const sol1Data = await createSol1.json();
      const sol1Id = sol1Data.solicitud.id_solicitud;
      console.log(`   - Solicitud creada con ID: ${sol1Id}`);

      // Comprobar que su notificación inicia como PENDIENTE (no leída)
      const notifCheck1 = await db.query(
        'SELECT notificacion_leida, fecha_leida FROM solicitud_escuela WHERE id_solicitud = $1',
        [sol1Id]
      );
      console.log(`   - Estado inicial notificación en BD: notificacion_leida=${notifCheck1.rows[0].notificacion_leida}`);
      if (notifCheck1.rows[0].notificacion_leida === true) throw new Error('La notificación nueva debe ser pendiente');

      // Aprobar la solicitud
      console.log('   - Aprobando solicitud mediante endpoint /api/solicitudes/:id/aprobar...');
      const approveRes = await fetch(`http://localhost:5006/api/solicitudes/${sol1Id}/aprobar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const approveData = await approveRes.json();
      if (!approveData.success) throw new Error('Fallo al aprobar: ' + JSON.stringify(approveData));
      console.log(`   - Respuesta: ${approveData.message}`);

      // Comprobar en PostgreSQL que la notificación cambió a LEÍDA
      const dbSol1After = await db.query(
        'SELECT estado_solicitud, notificacion_leida, fecha_leida FROM solicitud_escuela WHERE id_solicitud = $1',
        [sol1Id]
      );
      console.log('   - Registro en PostgreSQL tras aprobación:', dbSol1After.rows[0]);
      if (dbSol1After.rows[0].estado_solicitud !== 'Aprobada') throw new Error('Estado de solicitud no es Aprobada');
      if (dbSol1After.rows[0].notificacion_leida !== true) throw new Error('La notificación no pasó a LEÍDA tras aprobación');
      console.log('   ✅ Verificado: Al aprobar la solicitud, la notificación pasa automáticamente a LEÍDA en PostgreSQL.\n');

      // 4. Crear solicitud de prueba para probar RECHAZO y cambio automático de notificación a LEÍDA
      console.log('4. Creando solicitud para prueba de RECHAZO automático de notificación...');
      const randomCct2 = '14EPR' + Math.floor(1000 + Math.random() * 9000) + 'R';
      const createSol2 = await fetch('http://localhost:5006/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Escuela Rural Para Prueba Rechazo',
          cct: randomCct2,
          nivel_educativo: 'Secundaria',
          turno: 'Vespertino',
          municipio: 'Tapalpa',
          estado: 'Jalisco',
          nombre_responsable: 'Director Prueba Dos',
          correo_responsable: `directivo2.${Date.now()}@rural.gob.mx`
        })
      });
      const sol2Data = await createSol2.json();
      const sol2Id = sol2Data.solicitud.id_solicitud;
      console.log(`   - Solicitud creada con ID: ${sol2Id}`);

      // Rechazar la solicitud
      console.log('   - Rechazando solicitud mediante endpoint /api/solicitudes/:id/rechazar...');
      const rejectRes = await fetch(`http://localhost:5006/api/solicitudes/${sol2Id}/rechazar`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo_rechazo: 'Falta documentación de predio escolar comunal.' })
      });
      const rejectData = await rejectRes.json();
      if (!rejectData.success) throw new Error('Fallo al rechazar: ' + JSON.stringify(rejectData));
      console.log(`   - Respuesta: ${rejectData.message}`);

      // Comprobar en PostgreSQL que la notificación cambió a LEÍDA
      const dbSol2After = await db.query(
        'SELECT estado_solicitud, motivo_rechazo, notificacion_leida, fecha_leida FROM solicitud_escuela WHERE id_solicitud = $1',
        [sol2Id]
      );
      console.log('   - Registro en PostgreSQL tras rechazo:', dbSol2After.rows[0]);
      if (dbSol2After.rows[0].estado_solicitud !== 'Rechazada') throw new Error('Estado de solicitud no es Rechazada');
      if (dbSol2After.rows[0].notificacion_leida !== true) throw new Error('La notificación no pasó a LEÍDA tras rechazo');
      console.log('   ✅ Verificado: Al rechazar la solicitud, la notificación pasa automáticamente a LEÍDA en PostgreSQL.\n');

      // 5. Crear solicitud y dejarla PENDIENTE: debe permanecer en la bandeja de pendientes
      console.log('5. Creando solicitud PENDIENTE sin dictaminar...');
      const randomCct3 = '14EPR' + Math.floor(1000 + Math.random() * 9000) + 'P';
      const createSol3 = await fetch('http://localhost:5006/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Escuela Rural Pendiente Sin Dictaminar',
          cct: randomCct3,
          nivel_educativo: 'Primaria',
          turno: 'Matutino',
          municipio: 'Zapotlán',
          estado: 'Jalisco',
          nombre_responsable: 'Director Prueba Tres',
          correo_responsable: `directivo3.${Date.now()}@rural.gob.mx`
        })
      });
      const sol3Data = await createSol3.json();
      const sol3Id = sol3Data.solicitud.id_solicitud;

      const notifListRes = await fetch('http://localhost:5006/api/notificaciones', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const notifListData = await notifListRes.json();
      const foundInPendientes = notifListData.pendientes.some(p => p.id_solicitud === sol3Id);
      const foundInLeidas = notifListData.leidas.some(l => l.id_solicitud === sol3Id);

      console.log(`   - ¿Aparece en bandeja de pendientes?: ${foundInPendientes}`);
      console.log(`   - ¿Aparece en bandeja de leídas?: ${foundInLeidas}`);
      if (!foundInPendientes || foundInLeidas) {
        throw new Error('La solicitud pendiente no está en la bandeja de pendientes');
      }
      console.log('   ✅ Verificado: Las solicitudes sin decisión permanecen en la bandeja de pendientes.\n');

      console.log('===========================================================');
      console.log('🎉 TODAS LAS VERIFICACIONES SE COMPLETARON CON ÉXITO');
      console.log('===========================================================');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Error en verificación:', err);
      server.close();
      process.exit(1);
    }
  });
}

runVerifications();

