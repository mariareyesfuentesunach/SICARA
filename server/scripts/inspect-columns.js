const { pool } = require('../config/db');

async function test() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Tables:', res.rows.map(r => r.table_name));
  
  for (const t of ['grupo', 'materia', 'grupos', 'materias', 'grupo_materia']) {
    const colRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [t]);
    if (colRes.rows.length > 0) {
      console.log(t, ':', colRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    }
  }
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
