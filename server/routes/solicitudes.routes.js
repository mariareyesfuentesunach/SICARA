const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/solicitudes - Listar solicitudes con paginación, búsqueda y filtros
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const estado = (req.query.estado || '').trim();

    let conditions = [];
    let params = [];
    let pIdx = 1;

    if (search) {
      conditions.push(`(
        nombre_escuela ILIKE $${pIdx} OR 
        cct ILIKE $${pIdx} OR 
        municipio ILIKE $${pIdx} OR 
        nombre_responsable ILIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    if (estado && estado.toLowerCase() !== 'todas') {
      conditions.push(`LOWER(estado_solicitud) = LOWER($${pIdx})`);
      params.push(estado);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Consulta de conteo
    const countQuery = `SELECT count(*) FROM solicitud_escuela ${whereClause}`;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Consulta paginada
    const dataQuery = `
      SELECT 
        id_solicitud,
        nombre_escuela,
        cct,
        nivel_educativo,
        turno,
        direccion,
        municipio,
        estado,
        codigo_postal,
        telefono,
        correo_institucional,
        nombre_responsable,
        correo_responsable,
        telefono_responsable,
        fecha_solicitud,
        estado_solicitud,
        motivo_rechazo
      FROM solicitud_escuela
      ${whereClause}
      ORDER BY fecha_solicitud DESC NULLS LAST
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    params.push(limit, offset);
    const dataRes = await db.query(dataQuery, params);

    return res.json({
      success: true,
      solicitudes: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error en GET /api/solicitudes:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar solicitudes.' });
  }
});

// GET /api/solicitudes/:id - Obtener detalle completo
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        id_solicitud,
        nombre_escuela,
        cct,
        nivel_educativo,
        turno,
        direccion,
        municipio,
        estado,
        codigo_postal,
        telefono,
        correo_institucional,
        nombre_responsable,
        correo_responsable,
        telefono_responsable,
        fecha_solicitud,
        estado_solicitud,
        motivo_rechazo
      FROM solicitud_escuela
      WHERE id_solicitud = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    return res.json({ success: true, solicitud: result.rows[0] });
  } catch (error) {
    console.error('Error en GET /api/solicitudes/:id:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar detalle de solicitud.' });
  }
});

// POST /api/solicitudes - Registrar nueva solicitud
router.post('/', async (req, res) => {
  try {
    const {
      nombre_escuela,
      cct,
      nivel_educativo,
      turno,
      direccion,
      municipio,
      estado,
      codigo_postal,
      telefono,
      correo_institucional,
      nombre_responsable,
      correo_responsable,
      telefono_responsable,
      contrasena_responsable,
    } = req.body;

    if (!nombre_escuela || !cct || !nombre_responsable || !correo_responsable) {
      return res.status(400).json({
        success: false,
        message: 'Los campos Nombre de escuela, CCT, Nombre de responsable y Correo son obligatorios.',
      });
    }

    // Hashear contraseña del responsable
    const rawPass = contrasena_responsable && contrasena_responsable.trim().length >= 6
      ? contrasena_responsable.trim()
      : 'Directivo2026!';
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(rawPass, salt);

    const insertRes = await db.query(
      `INSERT INTO solicitud_escuela (
        nombre_escuela, cct, nivel_educativo, turno, direccion, municipio, estado,
        codigo_postal, telefono, correo_institucional, nombre_responsable,
        correo_responsable, telefono_responsable, fecha_solicitud, estado_solicitud,
        contrasena_responsable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), 'Pendiente', $14)
      RETURNING id_solicitud, nombre_escuela, cct, estado_solicitud, fecha_solicitud`,
      [
        nombre_escuela.trim(),
        cct.trim().toUpperCase(),
        nivel_educativo || 'Primaria',
        turno || 'Matutino',
        direccion || '',
        municipio || '',
        estado || 'Jalisco',
        codigo_postal || '',
        telefono || '',
        correo_institucional || '',
        nombre_responsable.trim(),
        correo_responsable.trim().toLowerCase(),
        telefono_responsable || '',
        passHash,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Solicitud registrada exitosamente con estado Pendiente.',
      solicitud: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error en POST /api/solicitudes:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar la solicitud.' });
  }
});

// PUT /api/solicitudes/:id/aprobar - Aprobar solicitud y persistir en escuelas y directivo
router.put('/:id/aprobar', authMiddleware, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // 1. Obtener la solicitud
    const solRes = await client.query(
      `SELECT * FROM solicitud_escuela WHERE id_solicitud = $1 FOR UPDATE`,
      [id]
    );

    if (solRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    const sol = solRes.rows[0];

    // 2. Marcar solicitud como Aprobada
    await client.query(
      `UPDATE solicitud_escuela 
       SET estado_solicitud = 'Aprobada', motivo_rechazo = NULL 
       WHERE id_solicitud = $1`,
      [id]
    );

    // 3. Crear o actualizar escuela en tabla `escuelas`
    let id_escuela = null;
    const existingEscuela = await client.query(
      `SELECT id_escuela FROM escuelas WHERE UPPER(cct) = UPPER($1)`,
      [sol.cct]
    );

    if (existingEscuela.rows.length > 0) {
      id_escuela = existingEscuela.rows[0].id_escuela;
      await client.query(
        `UPDATE escuelas 
         SET nombre_escuela = $1, nivel_educativo = $2, turno = $3, direccion = $4,
             municipio = $5, estado = $6, codigo_postal = $7, telefono = $8,
             correo_institucional = $9, estado_escuela = 'Activa'
         WHERE id_escuela = $10`,
        [
          sol.nombre_escuela,
          sol.nivel_educativo,
          sol.turno,
          sol.direccion,
          sol.municipio,
          sol.estado,
          sol.codigo_postal,
          sol.telefono,
          sol.correo_institucional,
          id_escuela,
        ]
      );
    } else {
      const newEscuela = await client.query(
        `INSERT INTO escuelas (
          nombre_escuela, cct, nivel_educativo, turno, direccion, municipio,
          estado, codigo_postal, telefono, correo_institucional, estado_escuela
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Activa')
        RETURNING id_escuela`,
        [
          sol.nombre_escuela,
          sol.cct ? sol.cct.toUpperCase() : 'PENDIENTE',
          sol.nivel_educativo,
          sol.turno,
          sol.direccion,
          sol.municipio,
          sol.estado,
          sol.codigo_postal,
          sol.telefono,
          sol.correo_institucional,
        ]
      );
      id_escuela = newEscuela.rows[0].id_escuela;
    }

    // 4. Crear o asociar usuario Directivo si tiene correo_responsable
    if (sol.correo_responsable) {
      const userRes = await client.query(
        `SELECT id_usuario, rol FROM usuario WHERE LOWER(correo) = LOWER($1)`,
        [sol.correo_responsable]
      );

      const passHash = sol.contrasena_responsable || (await bcrypt.hash('Directivo2026!', 10));

      if (userRes.rows.length > 0) {
        // Actualizar asociación a la escuela si no es Administrador
        const existingUser = userRes.rows[0];
        if (existingUser.rol !== 'Administrador') {
          await client.query(
            `UPDATE usuario 
             SET id_escuela = $1, rol = 'Directivo', estado = 'Activo'
             WHERE id_usuario = $2`,
            [id_escuela, existingUser.id_usuario]
          );
        }
      } else {
        // Crear nuevo usuario Directivo
        await client.query(
          `INSERT INTO usuario (
            id_escuela, nombre, apellidos, correo, contrasena, rol, estado, fecha_registro
          ) VALUES ($1, $2, $3, $4, $5, 'Directivo', 'Activo', NOW())`,
          [
            id_escuela,
            sol.nombre_responsable || 'Directivo Responsable',
            '',
            sol.correo_responsable.toLowerCase(),
            passHash,
          ]
        );
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `La solicitud de "${sol.nombre_escuela}" ha sido aprobada exitosamente y registrada en el catálogo de escuelas.`,
      id_solicitud: id,
      id_escuela,
      estado_solicitud: 'Aprobada',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al aprobar solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error interno al aprobar la solicitud.' });
  } finally {
    client.release();
  }
});

// PUT /api/solicitudes/:id/rechazar - Rechazar solicitud con motivo justificado
router.put('/:id/rechazar', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_rechazo } = req.body;

    if (!motivo_rechazo || !motivo_rechazo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Es obligatorio proporcionar un motivo claro para rechazar la solicitud.',
      });
    }

    // Verificar existencia
    const solRes = await db.query(
      `SELECT nombre_escuela FROM solicitud_escuela WHERE id_solicitud = $1`,
      [id]
    );

    if (solRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    const nombre_escuela = solRes.rows[0].nombre_escuela;

    await db.query(
      `UPDATE solicitud_escuela 
       SET estado_solicitud = 'Rechazada', motivo_rechazo = $1 
       WHERE id_solicitud = $2`,
      [motivo_rechazo.trim(), id]
    );

    return res.json({
      success: true,
      message: `La solicitud de "${nombre_escuela}" ha sido rechazada.`,
      id_solicitud: id,
      estado_solicitud: 'Rechazada',
      motivo_rechazo: motivo_rechazo.trim(),
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error interno al rechazar la solicitud.' });
  }
});

module.exports = router;

