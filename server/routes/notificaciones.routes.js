const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/notificaciones
 * Obtiene las notificaciones de solicitudes de registro de escuelas organizadas en:
 * - Bandeja de notificaciones pendientes (notificacion_leida = false)
 * - Bandeja de notificaciones leídas (notificacion_leida = true)
 * 
 * Regla: Las notificaciones corresponden exclusivamente a solicitudes de registro de escuelas.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.id_solicitud,
        s.nombre_escuela,
        s.cct,
        s.nivel_educativo,
        s.turno,
        s.direccion,
        s.municipio,
        s.estado,
        s.codigo_postal,
        s.telefono,
        s.correo_institucional,
        s.nombre_responsable,
        s.correo_responsable,
        s.telefono_responsable,
        s.fecha_solicitud,
        s.estado_solicitud,
        s.motivo_rechazo,
        s.fecha_resolucion,
        COALESCE(s.notificacion_leida, false) AS notificacion_leida,
        s.fecha_leida
      FROM solicitud_escuela s
      ORDER BY s.fecha_solicitud DESC NULLS LAST
    `);

    const todas = result.rows.map((s) => ({
      id: s.id_solicitud,
      id_solicitud: s.id_solicitud,
      nombre_escuela: s.nombre_escuela,
      cct: s.cct || 'S/N',
      nivel_educativo: s.nivel_educativo || 'Primaria',
      turno: s.turno || 'Matutino',
      direccion: s.direccion || 'Sin dirección registrada',
      municipio: s.municipio || 'Jalisco',
      estado: s.estado || 'México',
      codigo_postal: s.codigo_postal || '',
      telefono: s.telefono || '',
      correo_institucional: s.correo_institucional || '',
      nombre_responsable: s.nombre_responsable || 'Responsable no asignado',
      correo_responsable: s.correo_responsable || '',
      telefono_responsable: s.telefono_responsable || '',
      fecha_solicitud: s.fecha_solicitud,
      estado_solicitud: s.estado_solicitud || 'Pendiente',
      motivo_rechazo: s.motivo_rechazo || null,
      fecha_resolucion: s.fecha_resolucion || null,
      leida: Boolean(s.notificacion_leida),
      fecha_leida: s.fecha_leida || null,
      titulo: `Solicitud de Registro: ${s.nombre_escuela}`,
      descripcion: `El plantel ${s.nombre_escuela} (CCT: ${s.cct || 'S/N'}, Nivel: ${s.nivel_educativo || 'Primaria'}) en ${s.municipio || 'Jalisco'} solicita incorporación a SICARA.`,
    }));

    const pendientes = todas.filter((n) => !n.leida);
    const leidas = todas.filter((n) => n.leida);

    return res.json({
      success: true,
      pendientes,
      leidas,
      totalPendientes: pendientes.length,
      totalLeidas: leidas.length,
      // Compatibilidad con vistas previas y contadores globales
      notificaciones: pendientes,
      conteoNoLeidas: pendientes.length,
    });
  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar notificaciones.' });
  }
});

/**
 * PUT /api/notificaciones/:id/leida
 * Marca la notificación de una solicitud como leída, moviéndola a la bandeja de leídas.
 */
router.put('/:id/leida', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE solicitud_escuela 
       SET notificacion_leida = true, fecha_leida = NOW() 
       WHERE id_solicitud = $1 
       RETURNING id_solicitud, nombre_escuela, notificacion_leida, fecha_leida`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    return res.json({
      success: true,
      message: `Notificación de "${result.rows[0].nombre_escuela}" movida a la bandeja de leídas.`,
      solicitud: result.rows[0],
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar notificación.' });
  }
});

/**
 * PUT /api/notificaciones/:id/pendiente
 * Marca la notificación de una solicitud como pendiente, manteniéndola o regresándola a la bandeja de pendientes.
 */
router.put('/:id/pendiente', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE solicitud_escuela 
       SET notificacion_leida = false, fecha_leida = NULL 
       WHERE id_solicitud = $1 
       RETURNING id_solicitud, nombre_escuela, notificacion_leida`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    return res.json({
      success: true,
      message: `Notificación de "${result.rows[0].nombre_escuela}" mantenida/marcada como pendiente.`,
      solicitud: result.rows[0],
    });
  } catch (error) {
    console.error('Error al marcar notificación como pendiente:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar notificación.' });
  }
});

/**
 * PUT /api/notificaciones/marcar-todas-leidas
 * Marca todas las solicitudes pendientes como leídas.
 */
router.put('/marcar-todas-leidas', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE solicitud_escuela 
       SET notificacion_leida = true, fecha_leida = NOW() 
       WHERE COALESCE(notificacion_leida, false) = false
       RETURNING id_solicitud`
    );

    return res.json({
      success: true,
      message: `${result.rowCount} notificaciones marcadas como leídas.`,
      actualizadas: result.rowCount,
    });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar notificaciones.' });
  }
});

module.exports = router;
