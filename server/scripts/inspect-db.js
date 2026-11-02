const db = require('../config/db');

async function inspect() {
  try {
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('=== TABLAS EXISTENTES ===');
    for (const t of tables.rows) {
      const tableName = t.table_name;
      console.log(`\n================== ${tableName} ==================`);
      const cols = await db.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);
      console.table(cols.rows);

      // Foreign keys and primary keys
      const pks = await db.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1;
      `, [tableName]);
      console.log('Primary Key(s):', pks.rows.map(r => r.column_name).join(', '));

      const fks = await db.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
      `, [tableName]);
      if (fks.rows.length > 0) {
        console.log('Foreign Keys:');
        console.table(fks.rows);
      }

      // Count
      const countRes = await db.query(`SELECT COUNT(*) FROM "${tableName}"`);
      console.log(`Registros actuales: ${countRes.rows[0].count}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error inspeccionando la base de datos:', err);
    process.exit(1);
  }
}

inspect();

