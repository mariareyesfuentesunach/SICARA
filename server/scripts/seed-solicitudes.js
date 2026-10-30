const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedSolicitudes() {
  try {
    const res = await db.query('SELECT count(*) FROM solicitud_escuela');
    const count = parseInt(res.rows[0].count, 10);
    if (count > 0) {
      console.log(`Ya existen ${count} solicitudes en solicitud_escuela. No se requiere seed.`);
      process.exit(0);
    }

    console.log('Insertando solicitudes de ejemplo para escuelas rurales...');

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Director2026!', salt);

    const solicitudes = [
      {
        nombre_escuela: 'Telesecundaria Benito Juárez',
        cct: '14ETV0045Z',
        nivel_educativo: 'Secundaria',
        turno: 'Matutino',
        direccion: 'Camino a El Salto S/N, Comunidad La Esperanza',
        municipio: 'Tapalpa',
        estado: 'Jalisco',
        codigo_postal: '49340',
        telefono: '3434251122',
        correo_institucional: 'telesecundaria.tapalpa@jalisco.edu.mx',
        nombre_responsable: 'María Elena',
        correo_responsable: 'm.elena.juarez@gmail.com',
        telefono_responsable: '3431029384',
        fecha_solicitud: '2026-10-24 09:15:00',
        estado_solicitud: 'Pendiente',
        motivo_rechazo: null,
        contrasena_responsable: defaultPassword,
      },
      {
        nombre_escuela: 'Primaria Rural Emiliano Zapata',
        cct: '14EPR0892K',
        nivel_educativo: 'Primaria',
        turno: 'Matutino',
        direccion: 'Calle Hidalgo #12, Ejido Santa Rosa',
        municipio: 'Mazamitla',
        estado: 'Jalisco',
        codigo_postal: '49500',
        telefono: '3825381190',
        correo_institucional: 'primaria.zapata@jalisco.edu.mx',
        nombre_responsable: 'Carlos Alberto Morales',
        correo_responsable: 'carlos.morales.director@gmail.com',
        telefono_responsable: '3829012345',
        fecha_solicitud: '2026-10-26 11:30:00',
        estado_solicitud: 'Pendiente',
        motivo_rechazo: null,
        contrasena_responsable: defaultPassword,
      },
      {
        nombre_escuela: 'Preescolar Comunitario Los Laureles',
        cct: '14EJN0120W',
        nivel_educativo: 'Preescolar',
        turno: 'Matutino',
        direccion: 'Carretera Libre Km 45, Los Laureles',
        municipio: 'Tequila',
        estado: 'Jalisco',
        codigo_postal: '46400',
        telefono: '3747420987',
        correo_institucional: 'preescolar.laureles@jalisco.edu.mx',
        nombre_responsable: 'Rosa Isela Peña',
        correo_responsable: 'rosaisela.p@hotmail.com',
        telefono_responsable: '3741122334',
        fecha_solicitud: '2026-10-21 14:00:00',
        estado_solicitud: 'Rechazada',
        motivo_rechazo: 'Clave CCT no coincide con el catálogo oficial de la SEP de la entidad federativa.',
        contrasena_responsable: defaultPassword,
      }
    ];

    for (const sol of solicitudes) {
      await db.query(
        `INSERT INTO solicitud_escuela (
          nombre_escuela, cct, nivel_educativo, turno, direccion, municipio, estado,
          codigo_postal, telefono, correo_institucional, nombre_responsable,
          correo_responsable, telefono_responsable, fecha_solicitud, estado_solicitud,
          motivo_rechazo, contrasena_responsable
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          sol.nombre_escuela, sol.cct, sol.nivel_educativo, sol.turno, sol.direccion,
          sol.municipio, sol.estado, sol.codigo_postal, sol.telefono, sol.correo_institucional,
          sol.nombre_responsable, sol.correo_responsable, sol.telefono_responsable,
          sol.fecha_solicitud, sol.estado_solicitud, sol.motivo_rechazo, sol.contrasena_responsable
        ]
      );
    }

    console.log('✅ Solicitudes de ejemplo insertadas exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error insertando solicitudes:', err);
    process.exit(1);
  }
}

seedSolicitudes();

