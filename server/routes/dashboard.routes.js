const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // 1. Total escuelas registradas
    const escuelasRes = await db.query('SELECT count(*) FROM escuelas');
    const totalEscuelas = parseInt(escuelasRes.rows[0].count, 10);

    // 2. Solicitudes por estado
    const solicitudesStatsRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(estado_solicitud) = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN LOWER(estado_solicitud) = 'aprobada' THEN 1 END) as aprobadas,
        COUNT(CASE WHEN LOWER(estado_solicitud) = 'rechazada' THEN 1 END) as rechazadas
      FROM solicitud_escuela
    `);

    const solStats = solicitudesStatsRes.rows[0];
    const totalSolicitudes = parseInt(solStats.total, 10);
    const solicitudesPendientes = parseInt(solStats.pendientes, 10);
    const solicitudesAprobadas = parseInt(solStats.aprobadas, 10);
    const solicitudesRechazadas = parseInt(solStats.rechazadas, 10);

    // 3. Total usuarios registrados y por rol
    const usuariosRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN rol = 'Administrador' THEN 1 END) as administradores,
        COUNT(CASE WHEN rol = 'Directivo' THEN 1 END) as directivos,
        COUNT(CASE WHEN rol = 'Docente' THEN 1 END) as docentes
      FROM usuario
    `);
    const userStats = usuariosRes.rows[0];
    const totalUsuarios = parseInt(userStats.total, 10);

    // 4. Total alertas activas en el sistema
    const alertasRes = await db.query(`
      SELECT COUNT(*) as activas FROM alerta WHERE LOWER(estado_alerta) = 'activa'
    `);
    const totalAlertas = parseInt(alertasRes.rows[0].activas, 10);

    // 5. Distribución de escuelas por nivel educativo
    const nivelEducativoRes = await db.query(`
      SELECT COALESCE(nivel_educativo, 'Sin especificar') as nivel, COUNT(*) as cantidad
      FROM escuelas
      GROUP BY nivel_educativo
      ORDER BY cantidad DESC
    `);

    // 6. Solicitudes recientes (últimas 5)
    const solicitudesRecientes = await db.query(`
      SELECT id_solicitud, nombre_escuela, cct, nivel_educativo, municipio, estado, fecha_solicitud, estado_solicitud
      FROM solicitud_escuela
      ORDER BY fecha_solicitud DESC NULLS LAST
      LIMIT 5
    `);

    // 7. Alertas recientes (últimas 5)
    const alertasRecientes = await db.query(`
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
      ORDER BY a.fecha_generacion DESC NULLS LAST
      LIMIT 5
    `);

    return res.json({
      success: true,
      stats: {
        totalEscuelas,
        totalSolicitudes,
        solicitudesPendientes,
        solicitudesAprobadas,
        solicitudesRechazadas,
        totalUsuarios,
        totalAlertas,
        rolesBreakdown: {
          administradores: parseInt(userStats.administradores, 10),
          directivos: parseInt(userStats.directivos, 10),
          docentes: parseInt(userStats.docentes, 10),
        },
        escuelasPorNivel: nivelEducativoRes.rows,
        solicitudesRecientes: solicitudesRecientes.rows,
        alertasRecientes: alertasRecientes.rows,
      },
    });
  } catch (error) {
    console.error('Error en /api/dashboard/stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al consultar las métricas del sistema.',
    });
  }
});

module.exports = router;

