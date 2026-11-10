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

// GET /api/escuelas/:id/respaldo - Generar y descargar respaldo completo de la escuela antes de eliminar
router.get('/:id/respaldo', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const escRes = await db.query(`SELECT * FROM escuelas WHERE id_escuela = $1`, [id]);
    if (escRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Escuela no encontrada.' });
    }
    const escuela = escRes.rows[0];

    // Usuarios y Directivo
    const usuariosRes = await db.query(
      `SELECT id_usuario, nombre, apellidos, correo, rol, estado, fecha_registro, cuenta_activada
       FROM usuario WHERE id_escuela = $1`,
      [id]
    );

    // Docentes
    const docentesRes = await db.query(
      `SELECT d.*, u.nombre, u.apellidos, u.correo
       FROM docentes d
       JOIN usuario u ON d.id_usuario = u.id_usuario
       WHERE d.id_escuela = $1`,
      [id]
    );

    // Grupos
    const gruposRes = await db.query(`SELECT * FROM grupo WHERE id_escuela = $1`, [id]);

    // Alumnos
    const alumnosRes = await db.query(`SELECT * FROM alumnos WHERE id_escuela = $1`, [id]);

    // Materias
    const materiasRes = await db.query(`SELECT * FROM materia WHERE id_escuela = $1`, [id]);

    // Asignaciones grupo_docente
    const asignacionesRes = await db.query(
      `SELECT gd.*, g.nombre_grupo, m.nombre_materia, u.nombre AS docente_nombre
       FROM grupo_docente gd
       JOIN grupo g ON gd.id_grupo = g.id_grupo
       JOIN materia m ON gd.id_materia = m.id_materia
       JOIN docentes d ON gd.id_docente = d.id_docente
       JOIN usuario u ON d.id_usuario = u.id_usuario
       WHERE g.id_escuela = $1`,
      [id]
    );

    // Calificaciones
    const calificacionesRes = await db.query(
      `SELECT c.*, a.nombre AS alumno_nombre, a.apellidos AS alumno_apellidos, m.nombre_materia
       FROM calificacion c
       JOIN alumnos a ON c.id_alumno = a.id_alumno
       JOIN materia m ON c.id_materia = m.id_materia
       WHERE a.id_escuela = $1`,
      [id]
    );

    // Asistencias
    const asistenciasRes = await db.query(
      `SELECT asi.*, a.nombre AS alumno_nombre, a.apellidos AS alumno_apellidos, g.nombre_grupo
       FROM asistencia asi
       JOIN alumnos a ON asi.id_alumno = a.id_alumno
       LEFT JOIN grupo g ON asi.id_grupo = g.id_grupo
       WHERE a.id_escuela = $1`,
      [id]
    );

    // Alertas y Reportes
    const alertasRes = await db.query(`SELECT * FROM alerta WHERE id_escuela = $1`, [id]);
    const reportesRes = await db.query(`SELECT * FROM reporte WHERE id_escuela = $1`, [id]);

    const backupData = {
      meta: {
        sistema: 'SICARA - Sistema de Control y Rendimiento Académico',
        tipo_respaldo: 'Respaldo Institucional Completo de Escuela',
        fecha_generacion: new Date().toISOString(),
        generado_por: {
          id_usuario: req.user.id_usuario,
          nombre: req.user.nombre,
          correo: req.user.correo,
          es_principal: req.user.es_principal,
        },
      },
      escuela,
      estadisticas: {
        total_usuarios: usuariosRes.rows.length,
        total_docentes: docentesRes.rows.length,
        total_grupos: gruposRes.rows.length,
        total_alumnos: alumnosRes.rows.length,
        total_materias: materiasRes.rows.length,
        total_calificaciones: calificacionesRes.rows.length,
        total_asistencias: asistenciasRes.rows.length,
      },
      usuarios: usuariosRes.rows,
      docentes: docentesRes.rows,
      grupos: gruposRes.rows,
      alumnos: alumnosRes.rows,
      materias: materiasRes.rows,
      asignaciones: asignacionesRes.rows,
      calificaciones: calificacionesRes.rows,
      asistencias: asistenciasRes.rows,
      alertas: alertasRes.rows,
      reportes: reportesRes.rows,
    };

    const cleanCCT = (escuela.cct || 'escuela').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `respaldo_escuela_${cleanCCT}_${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Error al generar respaldo de escuela:', error);
    return res.status(500).json({ success: false, message: 'Error interno al generar el archivo de respaldo.' });
  }
});

// DELETE /api/escuelas/:id - Eliminar escuela definitivamente desde la BD (Solo Administrador Principal)
router.delete('/:id', authMiddleware, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    // REGLA CRÍTICA: Solo el Administrador Principal puede eliminar escuelas de la base de datos
    if (!req.user || !req.user.es_principal) {
      return res.status(403).json({
        success: false,
        code: 'REQUIERE_AUTORIZACION',
        message:
          'Operación restringida: Solo el Administrador Principal tiene autorización para eliminar escuelas de la base de datos. Como administrador secundario, debe emitir una solicitud de autorización.',
      });
    }

    const escCheck = await client.query(`SELECT nombre_escuela, cct FROM escuelas WHERE id_escuela = $1`, [id]);
    if (escCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'La escuela no existe o ya fue eliminada.' });
    }

    const { nombre_escuela, cct } = escCheck.rows[0];

    await client.query('BEGIN');

    // 1. Eliminar calificaciones de los alumnos de la escuela
    await client.query(
      `DELETE FROM calificacion WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1)`,
      [id]
    );

    // 2. Eliminar asistencias
    await client.query(
      `DELETE FROM asistencia WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1)
       OR id_grupo IN (SELECT id_grupo FROM grupo WHERE id_escuela = $1)`,
      [id]
    );

    // 3. Eliminar rendimiento académico
    await client.query(
      `DELETE FROM rendimiento_academico WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1)`,
      [id]
    );

    // 4. Eliminar alertas y reportes
    await client.query(`DELETE FROM alerta WHERE id_escuela = $1`, [id]);
    await client.query(`DELETE FROM reporte WHERE id_escuela = $1`, [id]);

    // 5. Eliminar inscripciones y asignaciones
    await client.query(
      `DELETE FROM grupo_alumno WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1)
       OR id_grupo IN (SELECT id_grupo FROM grupo WHERE id_escuela = $1)`,
      [id]
    );
    await client.query(
      `DELETE FROM grupo_docente WHERE id_grupo IN (SELECT id_grupo FROM grupo WHERE id_escuela = $1)
       OR id_docente IN (SELECT id_docente FROM docentes WHERE id_escuela = $1)`,
      [id]
    );

    // 6. Eliminar alumnos y docentes
    await client.query(`DELETE FROM alumnos WHERE id_escuela = $1`, [id]);
    await client.query(`DELETE FROM docentes WHERE id_escuela = $1`, [id]);

    // 7. Eliminar grupos y materias
    await client.query(`DELETE FROM grupo WHERE id_escuela = $1`, [id]);
    await client.query(`DELETE FROM materia WHERE id_escuela = $1`, [id]);

    // 8. Desvincular solicitudes de escuela
    await client.query(`UPDATE solicitud_escuela SET id_escuela = NULL WHERE id_escuela = $1`, [id]);

    // 9. Eliminar usuarios vinculados a la escuela (incluye directivo)
    await client.query(`DELETE FROM usuario WHERE id_escuela = $1`, [id]);

    // 10. Eliminar la escuela
    await client.query(`DELETE FROM escuelas WHERE id_escuela = $1`, [id]);

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `La escuela "${nombre_escuela}" (CCT: ${cct || 'S/N'}) y toda su estructura han sido eliminadas definitivamente de la base de datos.`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar escuela de la BD:', error);
    return res.status(500).json({ success: false, message: 'Error interno al eliminar la escuela de la base de datos.', error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;

