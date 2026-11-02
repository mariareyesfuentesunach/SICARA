const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function testPhase2() {
  console.log('===============================================================');
  console.log('🧪 INICIANDO PRUEBAS AUTOMATIZADAS DE LA SEGUNDA ETAPA (FASE 2)');
  console.log('===============================================================\n');

  // Importar Express y montar rutas para probar el servidor directamente
  const express = require('express');
  const cors = require('cors');
  const authRoutes = require('../routes/auth.routes');
  const dashboardRoutes = require('../routes/dashboard.routes');
  const solicitudesRoutes = require('../routes/solicitudes.routes');
  const escuelasRoutes = require('../routes/escuelas.routes');
  const usuariosRoutes = require('../routes/usuarios.routes');
  const administradoresRoutes = require('../routes/administradores.routes');
  const notificacionesRoutes = require('../routes/notificaciones.routes');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/solicitudes', solicitudesRoutes);
  app.use('/api/escuelas', escuelasRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/administradores', administradoresRoutes);
  app.use('/api/notificaciones', notificacionesRoutes);

  const server = app.listen(5002, async () => {
    try {
      const BASE = 'http://localhost:5002/api';

      // -------------------------------------------------------------
      // TEST 1: Login de Administrador Principal
      // -------------------------------------------------------------
      console.log('🔹 [PRUEBA 1] Login con Administrador Principal (Admin_Palasio@gmail.com)...');
      const loginPrincipalRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: 'Admin123' }),
      });
      const loginPrincipalData = await loginPrincipalRes.json();
      if (!loginPrincipalRes.ok || !loginPrincipalData.token || !loginPrincipalData.user.es_principal) {
        throw new Error('Fallo en login principal: ' + JSON.stringify(loginPrincipalData));
      }
      const tokenPrincipal = loginPrincipalData.token;
      console.log('   ✅ Login principal exitoso. es_principal:', loginPrincipalData.user.es_principal);

      // -------------------------------------------------------------
      // TEST 2: Intentar crear administrador sin ser principal o con datos erróneos
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 2] Validaciones al crear administrador adicional...');
      // 2.1 Contraseña no coincide
      const badPassRes = await fetch(`${BASE}/administradores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenPrincipal}`,
        },
        body: JSON.stringify({
          nombre: 'Admin Prueba',
          correo: 'admin.invalido@sicara.gob.mx',
          contrasena: 'Pass123!',
          confirmar_contrasena: 'OtraPass456!',
        }),
      });
      if (badPassRes.status !== 400) {
        throw new Error('Debió fallar por contraseñas que no coinciden');
      }
      console.log('   ✅ Validada coincidencia de contraseñas (HTTP 400).');

      // 2.2 Correo inválido
      const badEmailRes = await fetch(`${BASE}/administradores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenPrincipal}`,
        },
        body: JSON.stringify({
          nombre: 'Admin Prueba',
          correo: 'correo_sin_arroba',
          contrasena: 'Pass123!',
          confirmar_contrasena: 'Pass123!',
        }),
      });
      if (badEmailRes.status !== 400) {
        throw new Error('Debió fallar por correo con formato inválido');
      }
      console.log('   ✅ Validado formato de correo (HTTP 400).');

      // -------------------------------------------------------------
      // TEST 3: Crear exitosamente Administrador General adicional
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 3] Crear Administrador General adicional...');
      // Limpiar usuario de prueba si existiera
      await db.query(`DELETE FROM usuario WHERE LOWER(correo) = 'admin.secundario@sicara.gob.mx'`);

      const createAdminRes = await fetch(`${BASE}/administradores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenPrincipal}`,
        },
        body: JSON.stringify({
          nombre: 'Rodrigo',
          apellidos: 'García Pérez',
          correo: 'admin.secundario@sicara.gob.mx',
          contrasena: 'Secundario123!',
          confirmar_contrasena: 'Secundario123!',
        }),
      });
      const createAdminData = await createAdminRes.json();
      if (!createAdminRes.ok || !createAdminData.administrador) {
        throw new Error('Fallo al crear administrador adicional: ' + JSON.stringify(createAdminData));
      }
      console.log('   ✅ Administrador adicional creado exitosamente:', createAdminData.administrador.correo, 'es_principal:', createAdminData.administrador.es_principal);

      // Verificar en BD que contraseña esté hasheada y no en texto plano
      const dbCheck = await db.query('SELECT contrasena FROM usuario WHERE correo = $1', ['admin.secundario@sicara.gob.mx']);
      if (!dbCheck.rows[0].contrasena.startsWith('$2')) {
        throw new Error('La contraseña no está hasheada con bcrypt!');
      }
      console.log('   ✅ Contraseña protegida en PostgreSQL con hash bcrypt.');

      // -------------------------------------------------------------
      // TEST 4: Login con Administrador Adicional
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 4] Login con Administrador Adicional...');
      const loginSecundarioRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'admin.secundario@sicara.gob.mx', contrasena: 'Secundario123!' }),
      });
      const loginSecundarioData = await loginSecundarioRes.json();
      if (!loginSecundarioRes.ok || !loginSecundarioData.token) {
        throw new Error('Fallo en login de admin adicional: ' + JSON.stringify(loginSecundarioData));
      }
      const tokenSecundario = loginSecundarioData.token;
      console.log('   ✅ Login exitoso de Administrador adicional. Rol:', loginSecundarioData.user.rol, 'es_principal:', loginSecundarioData.user.es_principal);

      // -------------------------------------------------------------
      // TEST 5: Salvaguardas de seguridad para Administrador Adicional
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 5] Verificando salvaguardas de seguridad para Administrador Adicional...');

      // 5.1 Admin adicional NO puede crear otros administradores
      const hackCreateRes = await fetch(`${BASE}/administradores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenSecundario}`,
        },
        body: JSON.stringify({
          nombre: 'Hacker',
          correo: 'hack@sicara.gob.mx',
          contrasena: 'Hack123!',
          confirmar_contrasena: 'Hack123!',
        }),
      });
      if (hackCreateRes.status !== 403) {
        throw new Error('Administrador adicional NO debe poder crear administradores');
      }
      console.log('   ✅ Salvaguarda confirmada: Administrador adicional rechazado al intentar crear cuentas (HTTP 403).');

      // 5.2 Admin adicional NO puede desactivar la cuenta principal
      const principalUserRes = await db.query('SELECT id_usuario FROM usuario WHERE es_principal = true');
      const principalId = principalUserRes.rows[0].id_usuario;

      const hackToggleRes = await fetch(`${BASE}/administradores/${principalId}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenSecundario}`,
        },
        body: JSON.stringify({ estado: 'Inactivo' }),
      });
      if (hackToggleRes.status !== 403) {
        throw new Error('Administrador adicional NO debe poder alterar la cuenta principal');
      }
      console.log('   ✅ Salvaguarda confirmada: Bloqueada desactivación del Administrador Principal por cuenta adicional (HTTP 403).');

      // 5.3 El Administrador Principal tampoco puede desactivarse a sí mismo
      const selfToggleRes = await fetch(`${BASE}/administradores/${principalId}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenPrincipal}`,
        },
        body: JSON.stringify({ estado: 'Inactivo' }),
      });
      if (selfToggleRes.status !== 403) {
        throw new Error('La cuenta principal debe ser inviolable contra desactivación');
      }
      console.log('   ✅ Salvaguarda confirmada: Cuenta principal inviolable contra desactivación (HTTP 403).');

      // -------------------------------------------------------------
      // TEST 6: Gestión de Solicitudes por Administrador Adicional
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 6] Gestión de Solicitudes por Administrador Adicional...');
      // Crear una solicitud pendiente para probar aprobación
      const solTestCCT = '14DPR7788Z';
      await db.query(`DELETE FROM solicitud_escuela WHERE cct = $1`, [solTestCCT]);
      await db.query(`DELETE FROM escuelas WHERE cct = $1`, [solTestCCT]);

      const createSolRes = await fetch(`${BASE}/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Primaria Rural Benito Juarez Test',
          cct: solTestCCT,
          nivel_educativo: 'Primaria',
          turno: 'Matutino',
          municipio: 'Mazamitla',
          telefono: '3311223344',
          codigo_postal: '49500',
          nombre_responsable: 'Profesor Encargado',
          correo_responsable: 'encargado.test@gmail.com',
          telefono_responsable: '3399887766',
        }),
      });
      const createSolData = await createSolRes.json();
      if (!createSolRes.ok) {
        throw new Error('Fallo al crear solicitud de prueba: ' + JSON.stringify(createSolData));
      }
      const testSolId = createSolData.solicitud.id_solicitud;
      console.log('   ✅ Solicitud pendiente creada con ID:', testSolId);

      // Administrador adicional aprueba la solicitud
      const approveRes = await fetch(`${BASE}/solicitudes/${testSolId}/aprobar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenSecundario}`,
        },
      });
      const approveData = await approveRes.json();
      if (!approveRes.ok || approveData.estado_solicitud !== 'Aprobada') {
        throw new Error('Fallo al aprobar solicitud por administrador adicional: ' + JSON.stringify(approveData));
      }
      console.log('   ✅ Solicitud APROBADA exitosamente por Administrador Adicional.');

      // Verificar en PostgreSQL que se guardó fecha_resolucion e id_usuario_resolucion
      const checkSolRes = await db.query(
        'SELECT estado_solicitud, fecha_resolucion, id_usuario_resolucion FROM solicitud_escuela WHERE id_solicitud = $1',
        [testSolId]
      );
      const solRow = checkSolRes.rows[0];
      if (!solRow.fecha_resolucion || !solRow.id_usuario_resolucion) {
        throw new Error('No se guardó fecha_resolucion o id_usuario_resolucion en PostgreSQL!');
      }
      console.log('   ✅ Persistidos en PostgreSQL: fecha_resolucion y administrador responsable.');

      // -------------------------------------------------------------
      // TEST 7: Rechazar solicitud con motivo obligatorio
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 7] Rechazo de solicitud con motivo obligatorio...');
      const solRejectCCT = '14ETV9911X';
      await db.query(`DELETE FROM solicitud_escuela WHERE cct = $1`, [solRejectCCT]);

      const createSolRejectRes = await fetch(`${BASE}/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Telesecundaria Para Rechazo',
          cct: solRejectCCT,
          nivel_educativo: 'Telesecundaria',
          turno: 'Matutino',
          municipio: 'Tapalpa',
          nombre_responsable: 'Director Rechazo',
          correo_responsable: 'rechazo.test@gmail.com',
        }),
      });
      const rejectSolId = (await createSolRejectRes.json()).solicitud.id_solicitud;

      // Intentar rechazar sin motivo -> Debe fallar
      const badRejectRes = await fetch(`${BASE}/solicitudes/${rejectSolId}/rechazar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenSecundario}`,
        },
        body: JSON.stringify({ motivo_rechazo: '' }),
      });
      if (badRejectRes.status !== 400) {
        throw new Error('Debió fallar el rechazo sin motivo justificado');
      }
      console.log('   ✅ Validado motivo obligatorio de rechazo (HTTP 400 sin motivo).');

      // Rechazar con motivo justificado -> Debe ser exitoso
      const goodRejectRes = await fetch(`${BASE}/solicitudes/${rejectSolId}/rechazar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenSecundario}`,
        },
        body: JSON.stringify({ motivo_rechazo: 'Clave CCT inválida conforme al catálogo oficial del estado.' }),
      });
      const goodRejectData = await goodRejectRes.json();
      if (!goodRejectRes.ok || goodRejectData.estado_solicitud !== 'Rechazada') {
        throw new Error('Fallo al rechazar solicitud con motivo: ' + JSON.stringify(goodRejectData));
      }
      console.log('   ✅ Solicitud rechazada correctamente con motivo justificado.');

      // -------------------------------------------------------------
      // TEST 8: Validaciones de CCT, Teléfono y Correo
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 8] Validaciones de CCT mexicano, teléfono (10 dígitos) y CP...');
      const badCCTRes = await fetch(`${BASE}/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Escuela Invalida',
          cct: 'CCT_INCORRECTA',
          nombre_responsable: 'Responsable',
          correo_responsable: 'contacto@escuela.com',
        }),
      });
      if (badCCTRes.status !== 400) {
        throw new Error('Debió rechazar CCT no estándar');
      }
      console.log('   ✅ CCT no estándar rechazada correctamente (HTTP 400).');

      const badPhoneRes = await fetch(`${BASE}/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_escuela: 'Escuela Invalida',
          cct: '14DPR1111A',
          telefono: '12345', // menos de 10 dígitos
          nombre_responsable: 'Responsable',
          correo_responsable: 'contacto@escuela.com',
        }),
      });
      if (badPhoneRes.status !== 400) {
        throw new Error('Debió rechazar teléfono con menos de 10 dígitos');
      }
      console.log('   ✅ Teléfono con longitud distinta a 10 dígitos rechazado (HTTP 400).');

      // -------------------------------------------------------------
      // TEST 9: Notificaciones unificadas
      // -------------------------------------------------------------
      console.log('\n🔹 [PRUEBA 9] Consultando centro de notificaciones...');
      const notifRes = await fetch(`${BASE}/notificaciones`, {
        headers: { 'Authorization': `Bearer ${tokenPrincipal}` },
      });
      const notifData = await notifRes.json();
      if (!notifRes.ok || !Array.isArray(notifData.notificaciones)) {
        throw new Error('Fallo al consultar notificaciones');
      }
      console.log('   ✅ Notificaciones obtenidas:', notifData.notificaciones.length, 'registros.');
      const resueltas = notifData.notificaciones.filter(n => n.tipo === 'solicitud_resuelta');
      console.log('   ✅ Solicitudes resueltas registradas en el historial:', resueltas.length);

      console.log('\n===============================================================');
      console.log('🎉 TODAS LAS PRUEBAS AUTOMATIZADAS DE LA FASE 2 PASARON AL 100%');
      console.log('===============================================================');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ ERROR EN PRUEBAS DE FASE 2:', err);
      server.close();
      process.exit(1);
    }
  });
}

testPhase2();

