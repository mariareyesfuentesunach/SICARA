const { pool } = require('../config/db');

async function fixDocentesPendientes() {
  try {
    console.log('--- ACTUALIZANDO ESTADO DE DOCENTES NO ACTIVADOS A PENDIENTE ---');
    
    // Ver docentes actuales
    const res = await pool.query(`
      SELECT u.id_usuario, u.correo, u.rol, u.estado as estado_u, u.cuenta_activada, 
             d.id_docente, d.curp, d.estado as estado_d
      FROM usuario u
      LEFT JOIN docentes d ON u.id_usuario = d.id_usuario
      WHERE u.rol = 'Docente'
    `);
    console.log('Docentes encontrados:', res.rows);

    // Si cuenta_activada es FALSE o NULL, o la contraseña es provisional y estado es Inactivo,
    // su estado legítimo debe ser 'Pendiente' para que puedan usar el formulario de alta por CURP
    const updUsers = await pool.query(`
      UPDATE usuario
      SET estado = 'Pendiente'
      WHERE rol = 'Docente' 
        AND (cuenta_activada IS FALSE OR cuenta_activada IS NULL)
        AND (LOWER(estado) = 'inactivo' OR estado IS NULL)
      RETURNING id_usuario, correo, estado
    `);
    console.log('Usuarios actualizados a Pendiente:', updUsers.rows);

    const updDocs = await pool.query(`
      UPDATE docentes
      SET estado = 'Pendiente'
      WHERE id_usuario IN (
        SELECT id_usuario FROM usuario WHERE rol = 'Docente' AND (cuenta_activada IS FALSE OR cuenta_activada IS NULL)
      )
      AND (LOWER(estado) = 'inactivo' OR estado IS NULL)
      RETURNING id_docente, curp, estado
    `);
    console.log('Registros de docentes actualizados a Pendiente:', updDocs.rows);

    // Asegurarse de que lachito640@gmail.com esté en Pendiente con cuenta_activada = false si existe
    const targetUser = await pool.query(`
      UPDATE usuario
      SET estado = 'Pendiente', cuenta_activada = FALSE
      WHERE LOWER(correo) = 'lachito640@gmail.com'
      RETURNING id_usuario, correo, estado, cuenta_activada
    `);
    console.log('Target usuario lachito640@gmail.com:', targetUser.rows);

    const targetDoc = await pool.query(`
      UPDATE docentes
      SET estado = 'Pendiente'
      WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE LOWER(correo) = 'lachito640@gmail.com')
      RETURNING id_docente, curp, estado
    `);
    console.log('Target docente lachito640@gmail.com:', targetDoc.rows);

    console.log('✅ Proceso completado exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error al actualizar docentes:', err);
    process.exit(1);
  }
}

fixDocentesPendientes();

