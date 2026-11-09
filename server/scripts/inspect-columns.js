const { pool } = require('../config/db');

async function test() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuario'");
  console.log('Columns usuario:', res.rows.map(r => `${r.column_name} (${r.data_type})`));

  const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'solicitud_escuela'");
  console.log('Columns solicitud_escuela:', res2.rows.map(r => `${r.column_name} (${r.data_type})`));

  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });

