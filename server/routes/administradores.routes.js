const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Middleware para verificar que el usuario sea el Administrador Principal
function principalAdminOnly(req, res, next) {
  if (!req.user || !req.user.es_principal) {
    return res.status(403).json({
      success: false,
      message: 'Operación restringida: Solo el Administrador Principal tiene autorización para crear o gestionar cuentas administrativas.',
    });
  }
  next();
}

// GET /api/administradores - Listar administradores (Principal y Adicionales)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id_usuario,
        nombre,
        apellidos,
        correo,
        rol,
        estado,
        es_principal,
        fecha_registro
      FROM usuario
      WHERE rol = 'Administrador'
      ORDER BY 
        CASE WHEN es_principal THEN 1 ELSE 2 END,
        fecha_registro ASC
    `);

    return res.json({
      success: true,
      administradores: result.rows,
      currentUserIsPrincipal: Boolean(req.user.es_principal),
    });
  } catch (error) {
    console.error('Error al listar administradores:', error);
    return res.status(500).json({ success: false, message: 'Error interno al consultar las cuentas de administrador.' });
  }
});

// POST /api/administradores - Crear nuevo Administrador General adicional (Solo Principal)
router.post('/', authMiddleware, principalAdminOnly, async (req, res) => {
  try {
    const { nombre, apellidos, correo, contrasena, confirmar_contrasena } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }

    if (!correo || !correo.trim()) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es obligatorio.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = correo.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'El formato del correo electrónico no es válido.' });
    }

    if (!contrasena || contrasena.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña inicial debe tener al menos 6 caracteres.',
      });
    }

    if (contrasena !== confirmar_contrasena) {
      return res.status(400).json({
        success: false,
        message: 'La confirmación de la contraseña no coincide con la contraseña inicial.',
      });
    }

    // Verificar si el correo ya existe en la base de datos
    const existing = await db.query(
      'SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1',
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ingresado ya se encuentra registrado en el sistema.',
      });
    }

    // Hashear contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(contrasena, salt);

    // Insertar administrador adicional (es_principal = false)
    const insertRes = await db.query(
      `INSERT INTO usuario (
        nombre, apellidos, correo, contrasena, rol, estado, es_principal, fecha_registro
      ) VALUES ($1, $2, $3, $4, 'Administrador', 'Activo', false, NOW())
      RETURNING id_usuario, nombre, apellidos, correo, rol, estado, es_principal, fecha_registro`,
      [nombre.trim(), (apellidos || '').trim(), cleanEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: `El Administrador General adicional "${nombre.trim()}" ha sido creado exitosamente.`,
      administrador: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error al crear administrador adicional:', error);
    return res.status(500).json({ success: false, message: 'Error interno al registrar el administrador.' });
  }
});

// PUT /api/administradores/:id - Actualizar datos de un administrador (Solo Principal)
router.put('/:id', authMiddleware, principalAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, correo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }

    if (!correo || !correo.trim()) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es obligatorio.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = correo.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'El formato del correo electrónico no es válido.' });
    }

    // Verificar existencia del usuario
    const userRes = await db.query(
      'SELECT id_usuario, es_principal, correo FROM usuario WHERE id_usuario = $1 AND rol = $2',
      [id, 'Administrador']
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta de administrador no encontrada.' });
    }

    // Si se cambió el correo, validar duplicidad
    if (userRes.rows[0].correo.toLowerCase() !== cleanEmail) {
      const dupRes = await db.query(
        'SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1 AND id_usuario != $2',
        [cleanEmail, id]
      );
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'El correo ya está en uso por otra cuenta.' });
      }
    }

    const updateRes = await db.query(
      `UPDATE usuario 
       SET nombre = $1, apellidos = $2, correo = $3 
       WHERE id_usuario = $4
       RETURNING id_usuario, nombre, apellidos, correo, rol, estado, es_principal, fecha_registro`,
      [nombre.trim(), (apellidos || '').trim(), cleanEmail, id]
    );

    return res.json({
      success: true,
      message: 'Datos del administrador actualizados exitosamente.',
      administrador: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar administrador:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar datos.' });
  }
});

// PUT /api/administradores/:id/estado - Activar / Inactivar administrador adicional (Solo Principal)
router.put('/:id/estado', authMiddleware, principalAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !['Activo', 'Inactivo'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido. Debe ser "Activo" o "Inactivo".' });
    }

    const userRes = await db.query(
      'SELECT id_usuario, nombre, es_principal, rol FROM usuario WHERE id_usuario = $1',
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta de administrador no encontrada.' });
    }

    const target = userRes.rows[0];

    // Salvaguarda inviolable: El Administrador Principal no puede ser desactivado
    if (target.es_principal) {
      return res.status(403).json({
        success: false,
        message: 'Acción prohibida: No es posible desactivar la cuenta del Administrador Principal.',
      });
    }

    const updateRes = await db.query(
      `UPDATE usuario 
       SET estado = $1 
       WHERE id_usuario = $2
       RETURNING id_usuario, nombre, apellidos, correo, rol, estado, es_principal`,
      [estado, id]
    );

    return res.json({
      success: true,
      message: `El estado del administrador "${target.nombre}" ha sido actualizado a "${estado}".`,
      administrador: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error al cambiar estado de administrador:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar estado.' });
  }
});

// ==========================================
// SOLICITUDES DE AUTORIZACIÓN PARA ELIMINACIÓN DE ESCUELAS / DIRECTIVOS
// ==========================================

// POST /api/administradores/solicitudes-eliminacion - Emitir solicitud de eliminación (Administradores Secundarios)
router.post('/solicitudes-eliminacion', authMiddleware, async (req, res) => {
  try {
    const { tipo_entidad, id_entidad, nombre_entidad, motivo } = req.body;

    if (!tipo_entidad || !['Escuela', 'Directivo'].includes(tipo_entidad)) {
      return res.status(400).json({ success: false, message: 'Tipo de entidad inválido (debe ser Escuela o Directivo).' });
    }

    if (!id_entidad || !nombre_entidad || !motivo || !motivo.trim()) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios, incluyendo el motivo detallado.' });
    }

    const insertRes = await db.query(
      `INSERT INTO solicitud_eliminacion (
        id_usuario_solicitante,
        nombre_solicitante,
        correo_solicitante,
        tipo_entidad,
        id_entidad,
        nombre_entidad,
        motivo,
        estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pendiente')
      RETURNING *`,
      [
        req.user.id_usuario,
        req.user.nombre + ' ' + (req.user.apellidos || ''),
        req.user.correo,
        tipo_entidad,
        id_entidad,
        nombre_entidad.trim(),
        motivo.trim(),
      ]
    );

    return res.json({
      success: true,
      message: 'Solicitud de autorización enviada con éxito al Administrador Principal para su dictamen.',
      solicitud: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error al crear solicitud de eliminación:', error);
    return res.status(500).json({ success: false, message: 'Error interno al enviar solicitud de eliminación.' });
  }
});

// GET /api/administradores/solicitudes-eliminacion - Listar solicitudes (Principal ve todas; Secundario ve las suyas)
router.get('/solicitudes-eliminacion', authMiddleware, async (req, res) => {
  try {
    const isPrincipal = Boolean(req.user.es_principal);

    let query = `
      SELECT s.*, u.nombre AS autor_nombre, u.correo AS autor_correo
      FROM solicitud_eliminacion s
      LEFT JOIN usuario u ON s.id_usuario_solicitante = u.id_usuario
    `;
    const params = [];

    if (!isPrincipal) {
      params.push(req.user.id_usuario);
      query += ` WHERE s.id_usuario_solicitante = $1`;
    }

    query += ` ORDER BY CASE WHEN s.estado = 'Pendiente' THEN 1 ELSE 2 END, s.fecha_solicitud DESC`;

    const result = await db.query(query, params);
    return res.json({
      success: true,
      solicitudes: result.rows,
      currentUserIsPrincipal: isPrincipal,
    });
  } catch (error) {
    console.error('Error al listar solicitudes de eliminación:', error);
    return res.status(500).json({ success: false, message: 'Error interno al consultar solicitudes de eliminación.' });
  }
});

// PUT /api/administradores/solicitudes-eliminacion/:id/resolver - Dictaminar solicitud (Solo Administrador Principal)
router.put('/solicitudes-eliminacion/:id/resolver', authMiddleware, principalAdminOnly, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { accion, observaciones } = req.body; // 'Aprobar' o 'Rechazar'

    if (!['Aprobar', 'Rechazar'].includes(accion)) {
      client.release();
      return res.status(400).json({ success: false, message: 'Acción no válida (debe ser Aprobar o Rechazar).' });
    }

    const solCheck = await client.query(`SELECT * FROM solicitud_eliminacion WHERE id_solicitud = $1`, [id]);
    if (solCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    const solicitud = solCheck.rows[0];

    if (solicitud.estado !== 'Pendiente') {
      client.release();
      return res.status(400).json({ success: false, message: `Esta solicitud ya fue dictaminada como "${solicitud.estado}".` });
    }

    await client.query('BEGIN');

    if (accion === 'Aprobar') {
      if (solicitud.tipo_entidad === 'Escuela') {
        // Eliminar escuela en cascada
        const escId = solicitud.id_entidad;
        await client.query(`DELETE FROM calificacion WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1)`, [escId]);
        await client.query(`DELETE FROM asistencia WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1) OR id_grupo IN (SELECT id_grupo FROM grupo WHERE id_escuela = $1)`, [escId]);
        await client.query(`DELETE FROM rendimiento_academico WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1)`, [escId]);
        await client.query(`DELETE FROM alerta WHERE id_escuela = $1`, [escId]);
        await client.query(`DELETE FROM reporte WHERE id_escuela = $1`, [escId]);
        await client.query(`DELETE FROM grupo_alumno WHERE id_alumno IN (SELECT id_alumno FROM alumnos WHERE id_escuela = $1) OR id_grupo IN (SELECT id_grupo FROM grupo WHERE id_escuela = $1)`, [escId]);
        await client.query(`DELETE FROM grupo_docente WHERE id_grupo IN (SELECT id_grupo FROM grupo WHERE id_escuela = $1) OR id_docente IN (SELECT id_docente FROM docentes WHERE id_escuela = $1)`, [escId]);
        await client.query(`DELETE FROM alumnos WHERE id_escuela = $1`, [escId]);
        await client.query(`DELETE FROM docentes WHERE id_escuela = $1`, [escId]);
        await client.query(`DELETE FROM grupo WHERE id_escuela = $1`, [escId]);
        await client.query(`DELETE FROM materia WHERE id_escuela = $1`, [escId]);
        await client.query(`UPDATE solicitud_escuela SET id_escuela = NULL WHERE id_escuela = $1`, [escId]);
        await client.query(`DELETE FROM usuario WHERE id_escuela = $1`, [escId]);
        await client.query(`DELETE FROM escuelas WHERE id_escuela = $1`, [escId]);
      } else if (solicitud.tipo_entidad === 'Directivo') {
        const usrId = solicitud.id_entidad;
        await client.query(`DELETE FROM usuario WHERE id_usuario = $1`, [usrId]);
      }
    }

    const nuevoEstado = accion === 'Aprobar' ? 'Aprobada' : 'Rechazada';
    const updRes = await client.query(
      `UPDATE solicitud_eliminacion
       SET estado = $1,
           fecha_resolucion = CURRENT_TIMESTAMP,
           resolucion_por = $2,
           observaciones_resolucion = $3
       WHERE id_solicitud = $4
       RETURNING *`,
      [nuevoEstado, req.user.nombre + ' ' + (req.user.apellidos || ''), observaciones || null, id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Solicitud de eliminación ${nuevoEstado.toLowerCase()} exitosamente por el Administrador Principal.`,
      solicitud: updRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al resolver solicitud de eliminación:', error);
    return res.status(500).json({ success: false, message: 'Error interno al procesar el dictamen de la solicitud.' });
  } finally {
    client.release();
  }
});

module.exports = router;

