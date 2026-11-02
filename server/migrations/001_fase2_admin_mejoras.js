const db = require('../config/db');

async function runMigration() {
  console.log('=== INICIANDO MIGRACIÓN CONTROLADA FASE 2 ===');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Agregar columna es_principal a tabla usuario
    console.log('1. Verificando/agregando columna es_principal en usuario...');
    await client.query(`
      ALTER TABLE usuario 
      ADD COLUMN IF NOT EXISTS es_principal BOOLEAN DEFAULT false;
    `);

    // Asegurar que la cuenta inicial existente sea la Administradora Principal
    const adminEmail = 'Admin_Palasio@gmail.com';
    const updateRes = await client.query(`
      UPDATE usuario 
      SET es_principal = true 
      WHERE LOWER(correo) = LOWER($1);
    `, [adminEmail]);
    console.log(`   Cuenta principal configurada: ${updateRes.rowCount} usuario(s) actualizado(s) con es_principal=true.`);

    // 2. Agregar columnas fecha_resolucion e id_usuario_resolucion a solicitud_escuela
    console.log('2. Verificando/agregando columnas de resolución en solicitud_escuela...');
    await client.query(`
      ALTER TABLE solicitud_escuela 
      ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;
    `);

    await client.query(`
      ALTER TABLE solicitud_escuela 
      ADD COLUMN IF NOT EXISTS id_usuario_resolucion UUID DEFAULT NULL REFERENCES usuario(id_usuario);
    `);

    // Verificar estructura final
    const colsUsuario = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'usuario' AND column_name = 'es_principal';
    `);
    console.log('   Columna verificada en usuario:', colsUsuario.rows[0]);

    const colsSol = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'solicitud_escuela' AND column_name IN ('fecha_resolucion', 'id_usuario_resolucion');
    `);
    console.log('   Columnas verificadas en solicitud_escuela:', colsSol.rows);

    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente sin alterar registros previos.');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();

