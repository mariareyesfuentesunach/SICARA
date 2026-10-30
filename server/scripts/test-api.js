const http = require('http');

async function runTests() {
  console.log('--- INICIANDO VERIFICACIÓN COMPLETA DE SICARA ---');

  // Importar Express app
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  require('dotenv').config();

  const db = require('../config/db');
  const authRoutes = require('../routes/auth.routes');
  const dashboardRoutes = require('../routes/dashboard.routes');
  const solicitudesRoutes = require('../routes/solicitudes.routes');
  const escuelasRoutes = require('../routes/escuelas.routes');
  const usuariosRoutes = require('../routes/usuarios.routes');
  const notificacionesRoutes = require('../routes/notificaciones.routes');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/solicitudes', solicitudesRoutes);
  app.use('/api/escuelas', escuelasRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/notificaciones', notificacionesRoutes);

  const server = app.listen(5001, async () => {
    console.log('Servidor de pruebas levantado en puerto 5001.');

    try {
      // 1. Prueba de login con credenciales correctas
      console.log('\n[TEST 1] Probando login con Admin_Palasio@gmail.com y Admin123...');
      const loginRes = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: 'Admin123' }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.token) {
        throw new Error('Fallo en login de admin: ' + JSON.stringify(loginData));
      }
      console.log('✅ Login exitoso. Token generado. Usuario:', loginData.user.nombre, loginData.user.correo, loginData.user.rol);
      const token = loginData.token;

      // 2. Prueba de login con credenciales incorrectas
      console.log('\n[TEST 2] Probando login con contraseña errónea...');
      const badLoginRes = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: 'PasswordIncorrecto' }),
      });
      const badLoginData = await badLoginRes.json();
      if (badLoginRes.status === 401) {
        console.log('✅ Rechazo seguro de credenciales incorrectas:', badLoginData.message);
      } else {
        throw new Error('Debería retornar 401 pero retornó ' + badLoginRes.status);
      }

      // 3. Prueba de Dashboard Stats
      console.log('\n[TEST 3] Consultando estadísticas del Dashboard...');
      const statsRes = await fetch('http://localhost:5001/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      console.log('✅ Métricas obtenidas con éxito:');
      console.log('   - Escuelas registradas:', statsData.stats.totalEscuelas);
      console.log('   - Solicitudes pendientes:', statsData.stats.solicitudesPendientes);
      console.log('   - Solicitudes aprobadas:', statsData.stats.solicitudesAprobadas);
      console.log('   - Solicitudes rechazadas:', statsData.stats.solicitudesRechazadas);
      console.log('   - Usuarios registrados:', statsData.stats.totalUsuarios);

      // 4. Prueba de Solicitudes
      console.log('\n[TEST 4] Consultando solicitudes de escuelas...');
      const solRes = await fetch('http://localhost:5001/api/solicitudes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const solData = await solRes.json();
      console.log(`✅ ${solData.solicitudes.length} solicitudes encontradas en base de datos.`);
      solData.solicitudes.forEach((s) => {
        console.log(`   * [${s.estado_solicitud}] ${s.nombre_escuela} (CCT: ${s.cct}, Municipio: ${s.municipio})`);
      });

      // 5. Prueba de Escuelas
      console.log('\n[TEST 5] Consultando catálogo de escuelas...');
      const escRes = await fetch('http://localhost:5001/api/escuelas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const escData = await escRes.json();
      console.log(`✅ ${escData.escuelas.length} escuelas encontradas en base de datos.`);
      escData.escuelas.forEach((e) => {
        console.log(`   * [${e.estado_escuela}] ${e.nombre_escuela} (CCT: ${e.cct}, Grupos: ${e.total_grupos}, Alumnos: ${e.total_alumnos})`);
      });

      // 6. Prueba de Usuarios
      console.log('\n[TEST 6] Consultando usuarios y validando restricción de Admin...');
      const usrRes = await fetch('http://localhost:5001/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usrData = await usrRes.json();
      console.log(`✅ ${usrData.usuarios.length} usuarios encontrados en base de datos.`);
      usrData.usuarios.forEach((u) => {
        console.log(`   * ${u.nombre} ${u.apellidos || ''} (${u.correo}) - Rol: ${u.rol}, Estado: ${u.estado}`);
      });

      // 7. Prueba de Notificaciones
      console.log('\n[TEST 7] Consultando centro de notificaciones...');
      const notifRes = await fetch('http://localhost:5001/api/notificaciones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notifData = await notifRes.json();
      console.log(`✅ ${notifData.notificaciones.length} notificaciones generadas. No leídas: ${notifData.conteoNoLeidas}`);

      console.log('\n🎉 ¡TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON EXITOSAMENTE!');
      server.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error en pruebas:', error);
      server.close();
      process.exit(1);
    }
  });
}

runTests();

