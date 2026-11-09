const { pool } = require('../config/db');

async function check() {
  const sol = await pool.query(
    "SELECT id_solicitud, nombre_escuela, cct, nombre_responsable, correo_responsable, correo_institucional, estado_solicitud, fecha_resolucion FROM solicitud_escuela WHERE nombre_escuela ILIKE '%Juan Escutia%'"
  );
  console.log('--- SOLICITUD ---');
  console.log(sol.rows);

  const esc = await pool.query(
    "SELECT id_escuela, nombre_escuela, cct, estado_escuela FROM escuelas WHERE nombre_escuela ILIKE '%Juan Escutia%'"
  );
  console.log('--- ESCUELAS (conteo: ' + esc.rows.length + ') ---');
  console.log(esc.rows);

  if (sol.rows.length > 0 && sol.rows[0].correo_responsable) {
    const user = await pool.query(
      "SELECT id_usuario, correo, rol, estado, id_escuela FROM usuario WHERE LOWER(correo) = LOWER($1)",
      [sol.rows[0].correo_responsable]
    );
    console.log('--- USUARIO RESPONSABLE (conteo: ' + user.rows.length + ') ---');
    console.log(user.rows);
  }

  process.exit(0);
}

check().catch((e) => {
  console.error(e);
  process.exit(1);
});

