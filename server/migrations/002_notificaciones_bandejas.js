const db = require('../config/db');

async function runMigration() {
  console.log('=== INICIANDO MIGRACIÓN NOTIFICACIONES BANDEJAS ===');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Verificando/agregando columnas notificacion_leida y fecha_leida en solicitud_escuela...');
    await client.query(`
      ALTER TABLE solicitud_escuela 
      ADD COLUMN IF NOT EXISTS notificacion_leida BOOLEAN DEFAULT false;
    `);

    await client.query(`
      ALTER TABLE solicitud_escuela 
      ADD COLUMN IF NOT EXISTS fecha_leida TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;
    `);

    // Comprobar columnas
    const cols = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'solicitud_escuela' AND column_name IN ('notificacion_leida', 'fecha_leida');
    `);
    console.log('Columnas verificadas en solicitud_escuela:', cols.rows);

    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente.');
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

