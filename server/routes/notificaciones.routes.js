const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/notificaciones - Listado unificado de notificaciones administrativas
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 1. Solicitudes pendientes que requieren atención
    const solicitudesRes = await db.query(`
      SELECT 
        id_solicitud,
        nombre_escuela,
        cct,
        municipio,
        fecha_solicitud,
        estado_solicitud
      FROM solicitud_escuela
      WHERE LOWER(estado_solicitud) = 'pendiente'
      ORDER BY fecha_solicitud DESC
    `);

    // 2. Alertas académicas y de asistencia generadas en el sistema
    const alertasRes = await db.query(`
      SELECT 
        a.id_alerta,
        a.tipo_alerta,
        a.descripcion,
        a.fecha_generacion,
        a.estado_alerta,
        e.nombre_escuela,
        CONCAT(al.nombre, ' ', al.apellidos) as alumno_nombre
      FROM alerta a
      LEFT JOIN escuelas e ON a.id_escuela = e.id_escuela
      LEFT JOIN alumnos al ON a.id_alumno = al.id_alumno
      ORDER BY a.fecha_generacion DESC
    `);

    // 3. Solicitudes resueltas recientemente
    const resueltasRes = await db.query(`
      SELECT 
        id_solicitud,
        nombre_escuela,
        cct,
        estado_solicitud,
        fecha_solicitud
      FROM solicitud_escuela
      WHERE LOWER(estado_solicitud) IN ('aprobada', 'rechazada')
      ORDER BY fecha_solicitud DESC
      LIMIT 5
    `);

    // Construir lista unificada de notificaciones
    const notificaciones = [];

    solicitudesRes.rows.forEach((s) => {
      notificaciones.push({
        id: `sol-${s.id_solicitud}`,
        referencia_id: s.id_solicitud,
        tipo: 'solicitud_pendiente',
        categoria: 'Solicitudes',
        titulo: `Nueva solicitud: ${s.nombre_escuela}`,
        descripcion: `La escuela ${s.nombre_escuela} (CCT: ${s.cct || 'S/N'}) en ${s.municipio || 'Jalisco'} solicita registro en SICARA.`,
        fecha: s.fecha_solicitud,
        prioridad: 'alta',
        estado: 'Pendiente',
        enlace: '/solicitudes',
      });
    });

    alertasRes.rows.forEach((a) => {
      notificaciones.push({
        id: `alt-${a.id_alerta}`,
        referencia_id: a.id_alerta,
        tipo: 'alerta_academica',
        categoria: 'Alertas',
        titulo: `Alerta ${a.tipo_alerta}: ${a.nombre_escuela || 'Plantel Escolar'}`,
        descripcion: `${a.descripcion} (Alumno: ${a.alumno_nombre || 'No asignado'})`,
        fecha: a.fecha_generacion,
        prioridad: a.estado_alerta.toLowerCase() === 'activa' ? 'media' : 'baja',
        estado: a.estado_alerta,
        enlace: '/dashboard',
      });
    });

    resueltasRes.rows.forEach((r) => {
      notificaciones.push({
        id: `res-${r.id_solicitud}`,
        referencia_id: r.id_solicitud,
        tipo: 'solicitud_resuelta',
        categoria: 'Historial',
        titulo: `Solicitud ${r.estado_solicitud}: ${r.nombre_escuela}`,
        descripcion: `La solicitud de registro para ${r.nombre_escuela} fue catalogada como ${r.estado_solicitud}.`,
        fecha: r.fecha_solicitud,
        prioridad: 'baja',
        estado: r.estado_solicitud,
        enlace: '/solicitudes',
      });
    });

    // Ordenar por fecha descendente
    notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const noLeidas = notificaciones.filter((n) => n.estado.toLowerCase() === 'pendiente' || n.estado.toLowerCase() === 'activa').length;

    return res.json({
      success: true,
      notificaciones,
      conteoNoLeidas: noLeidas,
    });
  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar notificaciones.' });
  }
});

// PUT /api/notificaciones/alerta/:id/resolver - Marcar alerta como resuelta
router.put('/alerta/:id/resolver', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE alerta SET estado_alerta = 'Resuelta' WHERE id_alerta = $1 RETURNING id_alerta, estado_alerta`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada.' });
    }

    return res.json({ success: true, message: 'Alerta marcada como resuelta.', alerta: result.rows[0] });
  } catch (error) {
    console.error('Error al resolver alerta:', error);
    return res.status(500).json({ success: false, message: 'Error interno al resolver alerta.' });
  }
});

module.exports = router;

