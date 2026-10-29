const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function initAdmin() {
  try {
    const adminEmail = 'Admin_Palasio@gmail.com';
    const initialPassword = 'Admin123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    console.log('Verificando cuenta del Administrador General en la base de datos...');

    // Verificar si ya existe usuario con ese correo o con rol Administrador
    const resAdmin = await db.query(
      `SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1) OR rol = 'Administrador'`,
      [adminEmail]
    );

    if (resAdmin.rows.length > 0) {
      const existingUser = resAdmin.rows[0];
      console.log(`Usuario administrador encontrado (ID: ${existingUser.id_usuario}, Correo anterior: ${existingUser.correo}).`);
      
      // Actualizar a las credenciales requeridas sin duplicar
      await db.query(
        `UPDATE usuario 
         SET correo = $1, contrasena = $2, rol = 'Administrador', estado = 'Activo' 
         WHERE id_usuario = $3`,
        [adminEmail, passwordHash, existingUser.id_usuario]
      );
      console.log(`✅ Administrador General actualizado exitosamente:`);
      console.log(`   Correo: ${adminEmail}`);
      console.log(`   Rol: Administrador`);
      console.log(`   Estado: Activo`);
    } else {
      // Si no existe, insertar
      await db.query(
        `INSERT INTO usuario (nombre, apellidos, correo, contrasena, rol, estado, fecha_registro)
         VALUES ($1, $2, $3, $4, 'Administrador', 'Activo', NOW())`,
        ['Administrador', 'General SICARA', adminEmail, passwordHash]
      );
      console.log(`✅ Administrador General creado exitosamente:`);
      console.log(`   Correo: ${adminEmail}`);
      console.log(`   Rol: Administrador`);
      console.log(`   Estado: Activo`);
    }

    // Verificar datos
    const verify = await db.query(
      `SELECT id_usuario, nombre, apellidos, correo, rol, estado, fecha_registro 
       FROM usuario 
       WHERE LOWER(correo) = LOWER($1)`,
      [adminEmail]
    );
    console.log('Registro verificado:', verify.rows[0]);

    // Verificar que solo exista un Administrador General
    const countAdmins = await db.query(
      `SELECT count(*) FROM usuario WHERE rol = 'Administrador'`
    );
    console.log(`Total de Administradores en base de datos: ${countAdmins.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar Administrador General:', error);
    process.exit(1);
  }
}

initAdmin();
