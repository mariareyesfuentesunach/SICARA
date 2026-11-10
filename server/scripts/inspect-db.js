const { pool } = require('../config/db');

async function test() {
  const res = await pool.query(`
    SELECT
      tc.table_name, kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
    WHERE ccu.table_name = 'escuelas';
  `);
  console.log('FKs to escuelas:', res.rows);
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
