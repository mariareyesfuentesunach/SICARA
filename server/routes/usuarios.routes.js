const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/usuarios - Listado paginado con búsqueda y filtros
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const rol = (req.query.rol || '').trim();
    const estado = (req.query.estado || '').trim();

    let conditions = [];
    let params = [];
    let pIdx = 1;

    if (search) {
      conditions.push(`(
        u.nombre ILIKE $${pIdx} OR 
        u.apellidos ILIKE $${pIdx} OR 
        u.correo ILIKE $${pIdx} OR 
        e.nombre_escuela ILIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    if (rol && rol.toLowerCase() !== 'todos') {
      conditions.push(`LOWER(u.rol) = LOWER($${pIdx})`);
      params.push(rol);
      pIdx++;
    }

    if (estado && estado.toLowerCase() !== 'todos') {
      conditions.push(`LOWER(u.estado) = LOWER($${pIdx})`);
      params.push(estado);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Conteo total
    const countQuery = `
      SELECT count(*) 
      FROM usuario u 
      LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela 
      ${whereClause}
    `;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Consulta paginada (excluyendo contrasena)
    const dataQuery = `
      SELECT 
        u.id_usuario,
        u.id_escuela,
        u.nombre,
        u.apellidos,
        u.correo,
        u.rol,
        u.estado,
        u.fecha_registro,
        e.nombre_escuela,
        e.cct as escuela_cct
      FROM usuario u
      LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
      ${whereClause}
      ORDER BY 
        CASE WHEN u.rol = 'Administrador' THEN 1 ELSE 2 END,
        u.nombre ASC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    params.push(limit, offset);
    const dataRes = await db.query(dataQuery, params);

    return res.json({
      success: true,
      usuarios: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error en GET /api/usuarios:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar usuarios.' });
  }
});

// GET /api/usuarios/por-escuela - Listado de escuelas con usuarios relacionados y su desglose
router.get('/por-escuela', authMiddleware, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    let params = [];
    let searchCondition = '';

    if (search) {
      searchCondition = `
        AND (
          e.nombre_escuela ILIKE $1 OR 
          e.cct ILIKE $1 OR 
          e.municipio ILIKE $1 OR 
          u.nombre ILIKE $1 OR 
          u.apellidos ILIKE $1 OR 
          u.correo ILIKE $1
        )
      `;
      params.push(`%${search}%`);
    }

    const escuelasQuery = `
      SELECT DISTINCT 
        e.id_escuela, 
        e.nombre_escuela, 
        e.cct, 
        e.nivel_educativo, 
        e.turno, 
        e.municipio, 
        e.estado,
        e.direccion,
        e.telefono,
        e.correo_institucional,
        e.estado_escuela
      FROM escuelas e
      INNER JOIN usuario u ON e.id_escuela = u.id_escuela
      WHERE 1=1 ${searchCondition}
      ORDER BY e.nombre_escuela ASC
    `;

    const escuelasRes = await db.query(escuelasQuery, params);

    const escuelasConUsuarios = await Promise.all(
      escuelasRes.rows.map(async (esc) => {
        // Consultar Directivo encargado de acuerdo a relaciones reales
        const directivoRes = await db.query(
          `SELECT id_usuario, nombre, apellidos, correo, rol, estado, fecha_registro
           FROM usuario
           WHERE id_escuela = $1 AND rol = 'Directivo'
           LIMIT 1`,
          [esc.id_escuela]
        );

        // Consultar Profesores registrados de acuerdo a relaciones reales
        const profesoresRes = await db.query(
          `SELECT 
             u.id_usuario, 
             u.nombre, 
             u.apellidos, 
             u.correo, 
             u.rol, 
             u.estado, 
             u.fecha_registro,
             d.especialidad,
             d.curp,
             d.telefono as telefono_docente
           FROM usuario u
           LEFT JOIN docentes d ON u.id_usuario = d.id_usuario
           WHERE u.id_escuela = $1 AND u.rol = 'Docente'
           ORDER BY u.nombre ASC`,
          [esc.id_escuela]
        );

        return {
          ...esc,
          directivo: directivoRes.rows[0] || null,
          profesores: profesoresRes.rows,
          totalUsuarios: (directivoRes.rows.length ? 1 : 0) + profesoresRes.rows.length,
        };
      })
    );

    return res.json({
      success: true,
      escuelas: escuelasConUsuarios,
      totalEscuelas: escuelasConUsuarios.length,
    });
  } catch (error) {
    console.error('Error en GET /api/usuarios/por-escuela:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar usuarios por escuela.' });
  }
});

// GET /api/usuarios/:id - Detalle de usuario
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        u.id_usuario,
        u.id_escuela,
        u.nombre,
        u.apellidos,
        u.correo,
        u.rol,
        u.estado,
        u.fecha_registro,
        e.nombre_escuela,
        e.cct as escuela_cct
      FROM usuario u
      LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
      WHERE u.id_usuario = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Error en GET /api/usuarios/:id:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener usuario.' });
  }
});

// PUT /api/usuarios/:id/rol - Modificar rol de usuario con salvaguardas
router.put('/:id/rol', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    if (!rol || !['Directivo', 'Docente'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol no permitido. Solo se puede alternar entre "Directivo" y "Docente". Las cuentas de Administrador General se gestionan en su módulo exclusivo.',
      });
    }

    // Verificar usuario objetivo
    const userRes = await db.query('SELECT id_usuario, rol, nombre FROM usuario WHERE id_usuario = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const targetUser = userRes.rows[0];

    // Protección estricta: No cambiar el rol del Administrador General
    if (targetUser.rol === 'Administrador') {
      return res.status(403).json({
        success: false,
        message: 'Operación prohibida: Las cuentas administrativas no pueden ser modificadas desde este módulo. Utilice el módulo de Administradores.',
      });
    }

    await db.query('UPDATE usuario SET rol = $1 WHERE id_usuario = $2', [rol, id]);

    return res.json({
      success: true,
      message: `El rol de ${targetUser.nombre} ha sido actualizado a "${rol}".`,
      id_usuario: id,
      rol,
    });
  } catch (error) {
    console.error('Error al actualizar rol de usuario:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar rol.' });
  }
});

// PUT /api/usuarios/:id/estado - Activar / Inactivar usuario
router.put('/:id/estado', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !['Activo', 'Inactivo'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido. Debe ser "Activo" o "Inactivo".',
      });
    }

    const userRes = await db.query('SELECT id_usuario, rol, nombre FROM usuario WHERE id_usuario = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const targetUser = userRes.rows[0];

    // Protección estricta: No inactivar administradores desde esta vista
    if (targetUser.rol === 'Administrador') {
      return res.status(403).json({
        success: false,
        message: 'Operación prohibida: La gestión de estado para administradores debe realizarse exclusivamente desde el módulo de Administradores.',
      });
    }

    await db.query('UPDATE usuario SET estado = $1 WHERE id_usuario = $2', [estado, id]);

    return res.json({
      success: true,
      message: `El estado del usuario ${targetUser.nombre} ha cambiado a "${estado}".`,
      id_usuario: id,
      estado,
    });
  } catch (error) {
    console.error('Error al actualizar estado de usuario:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar estado.' });
  }
});

module.exports = router;
