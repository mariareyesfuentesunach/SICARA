const { pool } = require('../config/db');

async function migrate() {
  await pool.query(`
    ALTER TABLE usuario 
    ADD COLUMN IF NOT EXISTS token_activacion VARCHAR(255),
    ADD COLUMN IF NOT EXISTS token_activacion_expira TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cuenta_activada BOOLEAN DEFAULT TRUE;
  `);
  console.log('Migration completed successfully');
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});

