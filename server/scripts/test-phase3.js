// Usar fetch nativo de Node 18+
async function testPhase3() {
  console.log('--- TEST ETAPA 3 SICARA ---');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Test Login con contrasena > 72 chars
  const longPass = 'A'.repeat(73);
  const resLong = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: longPass })
  });
  const dataLong = await resLong.json();
  console.log('1. Rechazo contrasena > 72 chars:', resLong.status === 400 && dataLong.message.includes('72'));

  // 2. Test Login Valido
  const resLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'Admin_Palasio@gmail.com', contrasena: 'Admin123' })
  });
  const dataLogin = await resLogin.json();
  const token = dataLogin.token;
  console.log('2. Login exitoso admin principal:', !!token);

  // 3. Test Usuarios por escuela
  const resUsuariosEsc = await fetch(`${baseUrl}/usuarios/por-escuela`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataUsuariosEsc = await resUsuariosEsc.json();
  console.log('3. Usuarios agrupados por escuela recibido:', dataUsuariosEsc.success, 'Total escuelas:', dataUsuariosEsc.data ? dataUsuariosEsc.data.length : 0);
  if (dataUsuariosEsc.data && dataUsuariosEsc.data.length > 0) {
    const esc = dataUsuariosEsc.data[0];
    console.log('   Ejemplo escuela:', esc.nombre, '| Directivo:', esc.directivo ? esc.directivo.nombre_completo : 'Ninguno', '| Docentes:', esc.docentes.length);
  }

  // 4. Test solicitudes y comprobante
  const resSols = await fetch(`${baseUrl}/solicitudes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataSols = await resSols.json();
  console.log('4. Solicitudes consultadas status:', resSols.status, 'Total:', dataSols.solicitudes ? dataSols.solicitudes.length : (Array.isArray(dataSols) ? dataSols.length : 'otro'));

  console.log('--- FIN PRUEBAS FASE 3 ---');
}

testPhase3().catch(console.error);
