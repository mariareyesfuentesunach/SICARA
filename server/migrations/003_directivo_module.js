const db = require('../config/db');

async function migrate() {
  try {
    console.log('Iniciando migración para Módulo del Directivo...');
    
    // 1. Agregar columnas opcionales de personalización de colores a escuelas
    await db.query(`
      ALTER TABLE escuelas 
      ADD COLUMN IF NOT EXISTS color_primario VARCHAR(10) DEFAULT '#722F37',
      ADD COLUMN IF NOT EXISTS color_secundario VARCHAR(10) DEFAULT '#4A1722',
      ADD COLUMN IF NOT EXISTS color_complementario VARCHAR(10) DEFAULT '#A64D5A';
    `);
    console.log('✔ Columnas de colores institucionales verificadas en tabla escuelas');

    // 2. Agregar id_escuela opcional a tabla materia para soportar catálogo compartido o personalizado
    await db.query(`
      ALTER TABLE materia 
      ADD COLUMN IF NOT EXISTS id_escuela UUID REFERENCES escuelas(id_escuela) ON DELETE CASCADE;
    `);
    console.log('✔ Columna id_escuela verificada en tabla materia');

    // 3. Agregar id_grupo opcional a rendimiento_academico si no existe para filtros por grupo
    await db.query(`
      ALTER TABLE rendimiento_academico
      ADD COLUMN IF NOT EXISTS id_grupo UUID REFERENCES grupo(id_grupo) ON DELETE CASCADE;
    `);
    console.log('✔ Columna id_grupo verificada en rendimiento_academico');

    // 4. Agregar archivo_pdf opcional en reporte si no existe
    await db.query(`
      ALTER TABLE reporte
      ADD COLUMN IF NOT EXISTS datos_json JSONB,
      ADD COLUMN IF NOT EXISTS archivo_nombre VARCHAR(255);
    `);
    console.log('✔ Columnas adicionales en tabla reporte verificadas');

    console.log('Migración completada con éxito.');
    process.exit(0);
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
}

migrate();

