const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/escuelas - Listado paginado con búsqueda y filtro de estado
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
        e.nombre_escuela ILIKE $${pIdx} OR 
        e.cct ILIKE $${pIdx} OR 
        e.municipio ILIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    if (estado && estado.toLowerCase() !== 'todas') {
      conditions.push(`LOWER(e.estado_escuela) = LOWER($${pIdx})`);
      params.push(estado);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Conteo total
    const countQuery = `SELECT count(*) FROM escuelas e ${whereClause}`;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Consulta con métricas asociadas (grupos, alumnos, docentes)
    const dataQuery = `
      SELECT 
        e.id_escuela,
        e.nombre_escuela,
        e.cct,
        e.nivel_educativo,
        e.turno,
        e.direccion,
        e.municipio,
        e.estado,
        e.codigo_postal,
        e.telefono,
        e.correo_institucional,
        e.estado_escuela,
        (SELECT COUNT(*) FROM grupo g WHERE g.id_escuela = e.id_escuela) as total_grupos,
        (SELECT COUNT(*) FROM alumnos a WHERE a.id_escuela = e.id_escuela) as total_alumnos,
        (SELECT COUNT(*) FROM docentes d WHERE d.id_escuela = e.id_escuela) as total_docentes
      FROM escuelas e
      ${whereClause}
      ORDER BY e.nombre_escuela ASC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    params.push(limit, offset);
    const dataRes = await db.query(dataQuery, params);

    return res.json({
      success: true,
      escuelas: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error en GET /api/escuelas:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar escuelas.' });
  }
});

// GET /api/escuelas/:id - Detalle completo de una escuela y sus entidades
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Datos principales
    const escRes = await db.query(
      `SELECT * FROM escuelas WHERE id_escuela = $1`,
      [id]
    );

    if (escRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Escuela no encontrada.' });
    }

    const escuela = escRes.rows[0];

    // Grupos
    const gruposRes = await db.query(
      `SELECT id_grupo, nombre_grupo, grado, ciclo_escolar, estado 
       FROM grupo WHERE id_escuela = $1 ORDER BY grado, nombre_grupo`,
      [id]
    );

    // Docentes
    const docentesRes = await db.query(
      `SELECT d.id_docente, d.especialidad, d.curp, d.telefono, d.estado,
              u.nombre, u.apellidos, u.correo
       FROM docentes d
       LEFT JOIN usuario u ON d.id_usuario = u.id_usuario
       WHERE d.id_escuela = $1`,
      [id]
    );

    // Alertas
    const alertasRes = await db.query(
      `SELECT a.id_alerta, a.tipo_alerta, a.descripcion, a.fecha_generacion, a.estado_alerta,
              al.nombre as alumno_nombre, al.apellidos as alumno_apellidos
       FROM alerta a
       LEFT JOIN alumnos al ON a.id_alumno = al.id_alumno
       WHERE a.id_escuela = $1
       ORDER BY a.fecha_generacion DESC`,
      [id]
    );

    // Directivo asignado en usuario
    const directivoRes = await db.query(
      `SELECT id_usuario, nombre, apellidos, correo, estado
       FROM usuario
       WHERE id_escuela = $1 AND rol = 'Directivo'
       LIMIT 1`,
      [id]
    );

    return res.json({
      success: true,
      escuela,
      grupos: gruposRes.rows,
      docentes: docentesRes.rows,
      alertas: alertasRes.rows,
      directivo: directivoRes.rows[0] || null,
    });
  } catch (error) {
    console.error('Error en GET /api/escuelas/:id:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar detalle de escuela.' });
  }
});

// PUT /api/escuelas/:id/estado - Cambiar estado Activa / Inactiva
router.put('/:id/estado', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_escuela } = req.body;

    if (!estado_escuela || !['Activa', 'Inactiva'].includes(estado_escuela)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido. Debe ser "Activa" o "Inactiva".',
      });
    }

    const result = await db.query(
      `UPDATE escuelas 
       SET estado_escuela = $1 
       WHERE id_escuela = $2 
       RETURNING id_escuela, nombre_escuela, estado_escuela`,
      [estado_escuela, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Escuela no encontrada.' });
    }

    return res.json({
      success: true,
      message: `El estado de la escuela "${result.rows[0].nombre_escuela}" ha cambiado a "${estado_escuela}".`,
      escuela: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar estado de escuela:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar estado.' });
  }
});

// PUT /api/escuelas/:id - Actualizar datos de contacto y detalles
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_escuela,
      turno,
      direccion,
      municipio,
      estado,
      codigo_postal,
      telefono,
      correo_institucional,
    } = req.body;

    if (!nombre_escuela || !nombre_escuela.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la escuela es obligatorio.' });
    }

    const updateRes = await db.query(
      `UPDATE escuelas 
       SET nombre_escuela = $1, turno = $2, direccion = $3, municipio = $4,
           estado = $5, codigo_postal = $6, telefono = $7, correo_institucional = $8
       WHERE id_escuela = $9
       RETURNING *`,
      [
        nombre_escuela.trim(),
        turno || 'Matutino',
        direccion || '',
        municipio || '',
        estado || 'Jalisco',
        codigo_postal || '',
        telefono || '',
        correo_institucional || '',
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Escuela no encontrada.' });
    }

    return res.json({
      success: true,
      message: 'Información de la escuela actualizada exitosamente.',
      escuela: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar escuela:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar datos de la escuela.' });
  }
});

module.exports = router;

