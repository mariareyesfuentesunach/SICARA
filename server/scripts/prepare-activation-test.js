const { pool } = require('../config/db');

async function test() {
  await pool.query("UPDATE usuario SET cuenta_activada = FALSE WHERE correo = 'horacio.moreno35@unach.mx'");
  console.log('Set cuenta_activada = FALSE for Juan Escutia directivo test');
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});

