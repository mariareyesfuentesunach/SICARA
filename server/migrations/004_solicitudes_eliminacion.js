const db = require('../config/db');

async function runMigration() {
  console.log('=== INICIANDO MIGRACIÓN SOLICITUDES DE ELIMINACIÓN ===');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Tabla para registrar solicitudes de eliminación enviadas por administradores secundarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS solicitud_eliminacion (
        id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_usuario_solicitante UUID NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
        nombre_solicitante VARCHAR(200) NOT NULL,
        correo_solicitante VARCHAR(200) NOT NULL,
        tipo_entidad VARCHAR(50) NOT NULL, -- 'Escuela' o 'Directivo'
        id_entidad UUID NOT NULL,
        nombre_entidad VARCHAR(255) NOT NULL,
        motivo TEXT NOT NULL,
        estado VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente', 'Aprobada', 'Rechazada'
        fecha_solicitud TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        fecha_resolucion TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
        resolucion_por VARCHAR(200) DEFAULT NULL,
        observaciones_resolucion TEXT DEFAULT NULL
      );
    `);

    console.log('Tabla solicitud_eliminacion verificada/creada exitosamente.');

    await client.query('COMMIT');
    console.log('✅ Migración 004 completada con éxito.');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración 004:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();

