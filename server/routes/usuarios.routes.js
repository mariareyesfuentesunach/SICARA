const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { notificarEscuelaPorCorreo } = require('../utils/email');

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
        u.cuenta_activada,
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
          `SELECT id_usuario, nombre, apellidos, correo, rol, estado, cuenta_activada, fecha_registro
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
             u.cuenta_activada,
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

// POST /api/usuarios/:id/reenviar-activacion - Reenviar correo de activación con nuevo token
router.post('/:id/reenviar-activacion', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar al usuario y su escuela vinculada
    const userRes = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.rol, u.estado, u.cuenta_activada,
              e.id_escuela, e.nombre_escuela, e.cct
       FROM usuario u
       LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
       WHERE u.id_usuario = $1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const targetUser = userRes.rows[0];

    // Verificar si la cuenta ya está activada
    if (targetUser.cuenta_activada === true) {
      return res.status(400).json({
        success: false,
        code: 'CUENTA_YA_ACTIVADA',
        message: `La cuenta de ${targetUser.nombre} ya se encuentra activada. El usuario puede iniciar sesión directamente.`,
      });
    }

    if (!targetUser.correo) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene una dirección de correo electrónico registrada.',
      });
    }

    // Generar un nuevo token seguro de activación
    const nuevoToken = crypto.randomBytes(32).toString('hex');
    const tokenExpira = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas de vigencia

    // Guardar en la base de datos (invalidando cualquier token previo)
    await db.query(
      `UPDATE usuario
       SET token_activacion = $1,
           token_activacion_expira = $2
       WHERE id_usuario = $3`,
      [nuevoToken, tokenExpira, id]
    );

    // Despachar el correo electrónico institucional
    const emailStatus = await notificarEscuelaPorCorreo({
      destinatario: targetUser.correo,
      nombreEscuela: targetUser.nombre_escuela || 'Plantel Escolar',
      estado: 'Aprobada',
      solicitudData: {
        nombre_responsable: `${targetUser.nombre} ${targetUser.apellidos || ''}`.trim(),
        nombre_escuela: targetUser.nombre_escuela || 'Plantel Escolar',
        cct: targetUser.cct || 'N/A',
        token_activacion: nuevoToken,
      },
    });

    if (emailStatus && emailStatus.sent) {
      return res.json({
        success: true,
        message: `Correo de activación reenviado exitosamente a ${targetUser.correo}.`,
        emailStatus,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: `No se pudo enviar el correo de activación: ${emailStatus?.error || 'Error en el servicio SMTP.'}`,
        emailStatus,
      });
    }
  } catch (error) {
    console.error('Error al reenviar activación de usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar el reenvío del correo de activación.',
    });
  }
});

// GET /api/usuarios/:id/respaldo - Respaldo de información del directivo / usuario antes de eliminar
router.get('/:id/respaldo', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const uRes = await db.query(
      `SELECT u.id_usuario, u.id_escuela, u.nombre, u.apellidos, u.correo, u.rol, u.estado, u.fecha_registro,
              e.nombre_escuela, e.cct, e.municipio, e.estado AS estado_geo
       FROM usuario u
       LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
       WHERE u.id_usuario = $1`,
      [id]
    );

    if (uRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const usuario = uRes.rows[0];
    let escuelaInfo = null;

    if (usuario.id_escuela && usuario.rol === 'Directivo') {
      const gRes = await db.query(`SELECT COUNT(*)::int AS count FROM grupo WHERE id_escuela = $1`, [usuario.id_escuela]);
      const aRes = await db.query(`SELECT COUNT(*)::int AS count FROM alumnos WHERE id_escuela = $1`, [usuario.id_escuela]);
      const dRes = await db.query(`SELECT COUNT(*)::int AS count FROM docentes WHERE id_escuela = $1`, [usuario.id_escuela]);
      escuelaInfo = {
        nombre_escuela: usuario.nombre_escuela,
        cct: usuario.cct,
        total_grupos: gRes.rows[0].count,
        total_alumnos: aRes.rows[0].count,
        total_docentes: dRes.rows[0].count,
      };
    }

    const backupData = {
      meta: {
        sistema: 'SICARA - Respaldo Individual de Usuario / Directivo',
        fecha_generacion: new Date().toISOString(),
        generado_por: req.user.nombre,
      },
      usuario,
      escuela: escuelaInfo,
    };

    const cleanName = `${usuario.nombre}_${usuario.apellidos || ''}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `respaldo_usuario_${cleanName}_${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Error al generar respaldo de usuario:', error);
    return res.status(500).json({ success: false, message: 'Error interno al generar archivo de respaldo.' });
  }
});

// DELETE /api/usuarios/:id - Eliminar directivo / usuario desde la BD (Solo Administrador Principal)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Solo el Administrador Principal puede eliminar usuarios / directivos de la BD
    if (!req.user || !req.user.es_principal) {
      return res.status(403).json({
        success: false,
        code: 'REQUIERE_AUTORIZACION',
        message:
          'Operación restringida: Solo el Administrador Principal tiene autorización para eliminar cuentas directivas o administrativas de la base de datos.',
      });
    }

    const check = await db.query(
      `SELECT id_usuario, nombre, apellidos, rol, es_principal, id_escuela FROM usuario WHERE id_usuario = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const target = check.rows[0];

    // No se puede autoeliminar el Administrador Principal
    if (target.es_principal) {
      return res.status(403).json({
        success: false,
        message: 'Acción prohibida: No es posible eliminar la cuenta del Administrador Principal del sistema.',
      });
    }

    // Si es docente vinculado, retirar registro de docentes
    if (target.rol === 'Docente') {
      await db.query(`DELETE FROM docentes WHERE id_usuario = $1`, [id]);
    }

    await db.query(`DELETE FROM usuario WHERE id_usuario = $1`, [id]);

    return res.json({
      success: true,
      message: `El ${target.rol.toLowerCase()} "${target.nombre} ${target.apellidos || ''}" ha sido eliminado definitivamente de la base de datos.`,
    });
  } catch (error) {
    console.error('Error en DELETE /api/usuarios/:id:', error);
    return res.status(500).json({ success: false, message: 'Error interno al eliminar usuario.', error: error.message });
  }
});

module.exports = router;
