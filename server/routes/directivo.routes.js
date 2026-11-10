const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { directivoMiddleware, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { enviarCorreoAltaDocente } = require('../utils/email');

// ==========================================
// RUTA DE LOGO INSTITUCIONAL
// Accesible públicamente por ?escuela=:id o mediante token para etiquetas <img> en el navegador
// ==========================================
router.get('/logo', async (req, res) => {
  try {
    let id_escuela = req.query.escuela || req.query.id_escuela;

    if (!id_escuela) {
      const authHeader = req.headers['authorization'];
      const queryToken = req.query.token;
      const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (authHeader || queryToken);
      if (rawToken) {
        try {
          const decoded = jwt.verify(rawToken, JWT_SECRET);
          id_escuela = decoded.id_escuela;
        } catch (e) {}
      }
    }

    if (!id_escuela) {
      return res.status(404).send('Sin logotipo');
    }

    const result = await db.query(
      `SELECT logo_escuela, tipo_logo FROM escuelas WHERE id_escuela = $1`,
      [id_escuela]
    );

    if (result.rows.length === 0 || !result.rows[0].logo_escuela) {
      return res.status(404).send('Sin logotipo');
    }

    const { logo_escuela, tipo_logo } = result.rows[0];
    res.setHeader('Content-Type', tipo_logo || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(logo_escuela);
  } catch (err) {
    console.error('Error al entregar logo:', err);
    return res.status(500).send('Error');
  }
});

// Todas las demás rutas de este router requieren que el usuario sea Directivo y tenga id_escuela
router.use(directivoMiddleware);

// ==========================================
// 1. DASHBOARD DEL DIRECTIVO
// ==========================================
router.get('/dashboard', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;

    // 1.1 Conteos básicos
    const alumnosCountQuery = db.query(
      `SELECT COUNT(*)::int AS total FROM alumnos WHERE id_escuela = $1`,
      [id_escuela]
    );

    const docentesCountQuery = db.query(
      `SELECT COUNT(*)::int AS total FROM docentes WHERE id_escuela = $1 AND estado = 'Activo'`,
      [id_escuela]
    );

    const gruposCountQuery = db.query(
      `SELECT COUNT(*)::int AS total FROM grupo WHERE id_escuela = $1 AND estado = 'Activo'`,
      [id_escuela]
    );

    const materiasCountQuery = db.query(
      `SELECT COUNT(DISTINCT m.id_materia)::int AS total
       FROM materia m
       LEFT JOIN grupo_docente gd ON m.id_materia = gd.id_materia
       LEFT JOIN grupo g ON gd.id_grupo = g.id_grupo
       WHERE (m.id_escuela = $1 OR m.id_escuela IS NULL OR g.id_escuela = $1)
         AND m.estado = 'Activo'`,
      [id_escuela]
    );

    const alertasCountQuery = db.query(
      `SELECT COUNT(*)::int AS total 
       FROM alerta 
       WHERE id_escuela = $1 AND LOWER(estado_alerta) NOT IN ('atendida', 'resuelta')`,
      [id_escuela]
    );

    // 1.2 Promedio general de calificaciones de alumnos de esta escuela
    const promedioGeneralQuery = db.query(
      `SELECT ROUND(AVG(c.calificacion)::numeric, 1) AS promedio
       FROM calificacion c
       JOIN alumnos a ON c.id_alumno = a.id_alumno
       WHERE a.id_escuela = $1`,
      [id_escuela]
    );

    // 1.3 Asistencia general: (presentes / total_asistencias) * 100
    const asistenciaGeneralQuery = db.query(
      `SELECT 
         COUNT(*)::int AS total_registros,
         COUNT(CASE WHEN LOWER(asi.estado_asistencia) IN ('presente', 'asistencia', 'asistio') THEN 1 END)::int AS asistencias
       FROM asistencia asi
       JOIN alumnos a ON asi.id_alumno = a.id_alumno
       WHERE a.id_escuela = $1`,
      [id_escuela]
    );

    // 1.4 Rendimiento académico por periodo o nivel
    const nivelesRendimientoQuery = db.query(
      `SELECT 
         CASE 
           WHEN c.calificacion >= 9 THEN 'Excelente (9.0 - 10)'
           WHEN c.calificacion >= 8 THEN 'Bueno (8.0 - 8.9)'
           WHEN c.calificacion >= 6 THEN 'Regular (6.0 - 7.9)'
           ELSE 'En Riesgo (< 6.0)'
         END AS nivel,
         COUNT(*)::int AS total
       FROM calificacion c
       JOIN alumnos a ON c.id_alumno = a.id_alumno
       WHERE a.id_escuela = $1
       GROUP BY nivel
       ORDER BY total DESC`,
      [id_escuela]
    );

    // 1.5 Comparativa de desempeño entre grupos (promedio por grupo)
    const desempenoGruposQuery = db.query(
      `SELECT 
         g.id_grupo,
         g.nombre_grupo,
         g.grado,
         ROUND(AVG(c.calificacion)::numeric, 1) AS promedio,
         COUNT(DISTINCT c.id_alumno)::int AS alumnos_evaluados
       FROM grupo g
       JOIN calificacion c ON g.id_grupo = c.id_grupo
       WHERE g.id_escuela = $1
       GROUP BY g.id_grupo, g.nombre_grupo, g.grado
       ORDER BY g.grado ASC, g.nombre_grupo ASC`,
      [id_escuela]
    );

    // 1.6 Alertas por tipo
    const alertasPorTipoQuery = db.query(
      `SELECT tipo_alerta, COUNT(*)::int AS total
       FROM alerta
       WHERE id_escuela = $1
       GROUP BY tipo_alerta
       ORDER BY total DESC`,
      [id_escuela]
    );

    // 1.7 Alertas recientes sin resolver
    const alertasRecientesQuery = db.query(
      `SELECT al.id_alerta, al.tipo_alerta, al.descripcion, al.fecha_generacion, al.estado_alerta,
              a.nombre || ' ' || COALESCE(a.apellidos, '') AS alumno_nombre,
              a.id_alumno
       FROM alerta al
       LEFT JOIN alumnos a ON al.id_alumno = a.id_alumno
       WHERE al.id_escuela = $1
       ORDER BY al.fecha_generacion DESC
       LIMIT 5`,
      [id_escuela]
    );

    const [
      alumnosRes,
      docentesRes,
      gruposRes,
      materiasRes,
      alertasRes,
      promedioRes,
      asistenciaRes,
      nivelesRes,
      gruposDesempenoRes,
      alertasTipoRes,
      alertasRecientesRes,
    ] = await Promise.all([
      alumnosCountQuery,
      docentesCountQuery,
      gruposCountQuery,
      materiasCountQuery,
      alertasCountQuery,
      promedioGeneralQuery,
      asistenciaGeneralQuery,
      nivelesRendimientoQuery,
      desempenoGruposQuery,
      alertasPorTipoQuery,
      alertasRecientesQuery,
    ]);

    const totalAsistencias = asistenciaRes.rows[0].total_registros || 0;
    const asistenciasPresentes = asistenciaRes.rows[0].asistencias || 0;
    const porcentajeAsistencia = totalAsistencias > 0
      ? Math.round((asistenciasPresentes / totalAsistencias) * 100)
      : 100;

    return res.json({
      success: true,
      stats: {
        totalAlumnos: alumnosRes.rows[0].total || 0,
        totalDocentes: docentesRes.rows[0].total || 0,
        totalGrupos: gruposRes.rows[0].total || 0,
        totalMaterias: materiasRes.rows[0].total || 0,
        alertasPendientes: alertasRes.rows[0].total || 0,
        promedioGeneral: promedioRes.rows[0].promedio !== null ? Number(promedioRes.rows[0].promedio) : 0,
        porcentajeAsistencia,
      },
      charts: {
        nivelesRendimiento: nivelesRes.rows,
        desempenoGrupos: gruposDesempenoRes.rows,
        alertasPorTipo: alertasTipoRes.rows,
      },
      alertasRecientes: alertasRecientesRes.rows,
    });
  } catch (err) {
    console.error('Error en /api/directivo/dashboard:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar estadísticas del dashboard.' });
  }
});

// ==========================================
// 2. MÓDULO DE ALUMNOS
// ==========================================
router.get('/alumnos', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { q, estado, id_grupo } = req.query;

    let query = `
      SELECT a.id_alumno, a.id_escuela, a.nombre, a.apellidos, a.curp, a.fecha_nacimiento, a.estado,
             g.id_grupo, g.nombre_grupo, g.grado, g.ciclo_escolar, ga.fecha_inscripcion
      FROM alumnos a
      LEFT JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
      LEFT JOIN grupo g ON ga.id_grupo = g.id_grupo
      WHERE a.id_escuela = $1
    `;
    const params = [id_escuela];

    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      query += ` AND (LOWER(a.nombre) LIKE $${params.length} OR LOWER(COALESCE(a.apellidos, '')) LIKE $${params.length} OR LOWER(COALESCE(a.curp, '')) LIKE $${params.length})`;
    }

    if (estado && estado !== 'todos') {
      params.push(estado);
      query += ` AND a.estado = $${params.length}`;
    } else if (!estado) {
      query += ` AND (a.estado IS NULL OR a.estado != 'Inactivo')`;
    }

    if (id_grupo) {
      params.push(id_grupo);
      query += ` AND g.id_grupo = $${params.length}`;
    }

    query += ` ORDER BY a.apellidos ASC NULLS LAST, a.nombre ASC`;

    const result = await db.query(query, params);
    return res.json({ success: true, alumnos: result.rows });
  } catch (err) {
    console.error('Error en GET /api/directivo/alumnos:', err);
    return res.status(500).json({ success: false, message: 'Error al listar alumnos.' });
  }
});

router.post('/alumnos', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { nombre, apellidos, curp, fecha_nacimiento, estado, id_grupo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del alumno es obligatorio.' });
    }

    // Insertar alumno
    const insertRes = await db.query(
      `INSERT INTO alumnos (id_escuela, nombre, apellidos, curp, fecha_nacimiento, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id_escuela,
        nombre.trim(),
        (apellidos || '').trim(),
        curp ? curp.trim().toUpperCase() : null,
        fecha_nacimiento || null,
        estado || 'Activo',
      ]
    );

    const alumno = insertRes.rows[0];

    // Inscribir en grupo si se especificó
    if (id_grupo) {
      await db.query(
        `INSERT INTO grupo_alumno (id_grupo, id_alumno, fecha_inscripcion, estado)
         VALUES ($1, $2, CURRENT_DATE, 'Activo')`,
        [id_grupo, alumno.id_alumno]
      );
    }

    return res.json({
      success: true,
      message: 'Alumno registrado exitosamente.',
      alumno,
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/alumnos:', err);
    return res.status(500).json({ success: false, message: 'Error al registrar alumno.' });
  }
});

// Importar alumnos en lote desde CSV
router.post('/alumnos/batch', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { alumnos } = req.body;

    if (!Array.isArray(alumnos) || alumnos.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron alumnos para importar.' });
    }

    // Cachear grupos existentes para mapear por nombre o id
    const gruposRes = await db.query(
      `SELECT id_grupo, LOWER(TRIM(nombre_grupo)) AS nombre_norm FROM grupo WHERE id_escuela = $1`,
      [id_escuela]
    );
    const gruposMap = new Map();
    gruposRes.rows.forEach((g) => {
      gruposMap.set(g.nombre_norm, g.id_grupo);
      gruposMap.set(String(g.id_grupo), g.id_grupo);
    });

    let creados = 0;
    const errores = [];

    for (let i = 0; i < alumnos.length; i++) {
      const a = alumnos[i];
      const fila = a._rowNumber || i + 2;

      const nombre = (a.nombre || '').trim();
      const apellidos = (a.apellidos || '').trim();
      const curp = a.curp ? a.curp.trim().toUpperCase() : null;
      let fecha_nacimiento = a.fecha_nacimiento || null;
      if (fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
        // Tratar de adaptar DD/MM/AAAA o DD-MM-AAAA
        const ddmmyyyy = fecha_nacimiento.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
          const dia = ddmmyyyy[1].padStart(2, '0');
          const mes = ddmmyyyy[2].padStart(2, '0');
          const anio = ddmmyyyy[3];
          fecha_nacimiento = `${anio}-${mes}-${dia}`;
        } else {
          fecha_nacimiento = null;
        }
      }
      const estado = a.estado ? a.estado.trim() : 'Activo';

      if (!nombre) {
        errores.push({ fila, error: 'El nombre es obligatorio.' });
        continue;
      }

      try {
        const insertRes = await db.query(
          `INSERT INTO alumnos (id_escuela, nombre, apellidos, curp, fecha_nacimiento, estado)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id_alumno`,
          [id_escuela, nombre, apellidos, curp, fecha_nacimiento, estado]
        );
        const id_alumno = insertRes.rows[0].id_alumno;

        // Mapear grupo si se indicó
        const grupoVal = (a.grupo || a.nombre_grupo || a.id_grupo || '').toString().trim().toLowerCase();
        let targetGrupoId = null;
        if (grupoVal && gruposMap.has(grupoVal)) {
          targetGrupoId = gruposMap.get(grupoVal);
        }

        if (targetGrupoId) {
          await db.query(
            `INSERT INTO grupo_alumno (id_grupo, id_alumno, fecha_inscripcion, estado)
             VALUES ($1, $2, CURRENT_DATE, 'Activo')
             ON CONFLICT DO NOTHING`,
            [targetGrupoId, id_alumno]
          );
        }

        creados++;
      } catch (rowErr) {
        errores.push({ fila, error: rowErr.message || 'Error al guardar alumno.' });
      }
    }

    return res.json({
      success: true,
      message: `Se importaron ${creados} de ${alumnos.length} alumnos correctamente.`,
      creados,
      total: alumnos.length,
      errores,
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/alumnos/batch:', err);
    return res.status(500).json({ success: false, message: 'Error al importar alumnos en lote.' });
  }
});

router.put('/alumnos/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;
    const { nombre, apellidos, curp, fecha_nacimiento, estado, id_grupo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del alumno es obligatorio.' });
    }

    const check = await db.query(
      `SELECT * FROM alumnos WHERE id_alumno = $1 AND id_escuela = $2`,
      [id, id_escuela]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado en esta institución.' });
    }

    const updateRes = await db.query(
      `UPDATE alumnos
       SET nombre = $1, apellidos = $2, curp = $3, fecha_nacimiento = $4, estado = $5
       WHERE id_alumno = $6 AND id_escuela = $7
       RETURNING *`,
      [
        nombre.trim(),
        (apellidos || '').trim(),
        curp ? curp.trim().toUpperCase() : null,
        fecha_nacimiento || null,
        estado || 'Activo',
        id,
        id_escuela,
      ]
    );

    // Actualizar o inscribir grupo si se envió
    if (id_grupo !== undefined) {
      if (id_grupo) {
        // Verificar si ya está en grupo
        const gaCheck = await db.query(`SELECT * FROM grupo_alumno WHERE id_alumno = $1`, [id]);
        if (gaCheck.rows.length > 0) {
          await db.query(`UPDATE grupo_alumno SET id_grupo = $1, estado = 'Activo' WHERE id_alumno = $2`, [id_grupo, id]);
        } else {
          await db.query(
            `INSERT INTO grupo_alumno (id_grupo, id_alumno, fecha_inscripcion, estado)
             VALUES ($1, $2, CURRENT_DATE, 'Activo')`,
            [id_grupo, id]
          );
        }
      } else {
        // Desvincular de grupos
        await db.query(`DELETE FROM grupo_alumno WHERE id_alumno = $1`, [id]);
      }
    }

    return res.json({
      success: true,
      message: 'Información del alumno actualizada.',
      alumno: updateRes.rows[0],
    });
  } catch (err) {
    console.error('Error en PUT /api/directivo/alumnos/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar alumno.' });
  }
});

// Historial académico y asistencia del alumno
router.get('/alumnos/:id/historial', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const alumnoCheck = await db.query(
      `SELECT * FROM alumnos WHERE id_alumno = $1 AND id_escuela = $2`,
      [id, id_escuela]
    );
    if (alumnoCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }

    // Calificaciones
    const califRes = await db.query(
      `SELECT c.id_calificacion, c.periodo, c.calificacion, c.observaciones, c.fecha_registro,
              m.nombre_materia,
              u.nombre || ' ' || COALESCE(u.apellidos, '') AS docente_nombre
       FROM calificacion c
       JOIN materia m ON c.id_materia = m.id_materia
       LEFT JOIN docentes d ON c.id_docente = d.id_docente
       LEFT JOIN usuario u ON d.id_usuario = u.id_usuario
       WHERE c.id_alumno = $1
       ORDER BY c.fecha_registro DESC`,
      [id]
    );

    // Asistencias
    const asistRes = await db.query(
      `SELECT asi.id_asistencia, asi.fecha, asi.estado_asistencia, asi.observaciones,
              g.nombre_grupo
       FROM asistencia asi
       LEFT JOIN grupo g ON asi.id_grupo = g.id_grupo
       WHERE asi.id_alumno = $1
       ORDER BY asi.fecha DESC
       LIMIT 30`,
      [id]
    );

    // Alertas asociadas
    const alertRes = await db.query(
      `SELECT * FROM alerta WHERE id_alumno = $1 ORDER BY fecha_generacion DESC`,
      [id]
    );

    return res.json({
      success: true,
      alumno: alumnoCheck.rows[0],
      calificaciones: califRes.rows,
      asistencias: asistRes.rows,
      alertas: alertRes.rows,
    });
  } catch (err) {
    console.error('Error en historial alumno:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar historial del alumno.' });
  }
});

// ==========================================
// 3. MÓDULO DE DOCENTES
// ==========================================
router.get('/docentes', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { q, estado } = req.query;

    let query = `
      SELECT d.id_docente, d.id_usuario, d.id_escuela, d.curp, d.especialidad, d.telefono, d.estado,
             u.nombre, u.apellidos, u.correo, u.fecha_registro,
             COUNT(DISTINCT gd.id_grupo)::int AS total_grupos,
             COUNT(DISTINCT gd.id_materia)::int AS total_materias,
             COALESCE(
               JSON_AGG(
                 DISTINCT jsonb_build_object(
                   'id_materia', m.id_materia,
                   'nombre_materia', m.nombre_materia,
                   'id_grupo', g.id_grupo,
                   'nombre_grupo', g.nombre_grupo,
                   'grado', g.grado
                 )
               ) FILTER (WHERE m.id_materia IS NOT NULL),
               '[]'::json
             ) AS materias_impartidas
      FROM docentes d
      JOIN usuario u ON d.id_usuario = u.id_usuario
      LEFT JOIN grupo_docente gd ON d.id_docente = gd.id_docente
      LEFT JOIN materia m ON gd.id_materia = m.id_materia
      LEFT JOIN grupo g ON gd.id_grupo = g.id_grupo
      WHERE d.id_escuela = $1
    `;
    const params = [id_escuela];

    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      query += ` AND (LOWER(u.nombre) LIKE $${params.length} OR LOWER(COALESCE(u.apellidos, '')) LIKE $${params.length} OR LOWER(COALESCE(d.curp, '')) LIKE $${params.length} OR LOWER(u.correo) LIKE $${params.length})`;
    }

    if (estado && estado !== 'todos') {
      params.push(estado);
      query += ` AND d.estado = $${params.length}`;
    } else if (!estado) {
      query += ` AND (d.estado IS NULL OR d.estado != 'Inactivo')`;
    }

    query += ` GROUP BY d.id_docente, u.id_usuario ORDER BY u.nombre ASC`;

    const result = await db.query(query, params);
    return res.json({ success: true, docentes: result.rows });
  } catch (err) {
    console.error('Error en GET /api/directivo/docentes:', err);
    return res.status(500).json({ success: false, message: 'Error al listar docentes.' });
  }
});

router.post('/docentes', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { nombre, apellidos, correo, curp, especialidad, telefono, estado } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }
    if (!correo || !correo.trim()) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es obligatorio.' });
    }

    const trimmedEmail = correo.trim().toLowerCase();
    const cleanCurp = curp ? curp.trim().toUpperCase() : null;

    // Validar si el correo ya existe
    const existUser = await db.query(`SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1`, [trimmedEmail]);
    if (existUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Ya existe una cuenta registrada con este correo electrónico.' });
    }

    // Consultar nombre de la escuela para el correo
    const escRes = await db.query(`SELECT nombre_escuela FROM escuelas WHERE id_escuela = $1`, [id_escuela]);
    const nombreEscuela = escRes.rows.length > 0 ? escRes.rows[0].nombre_escuela : 'Escuela SICARA';

    // Se asigna un hash temporal hasta que el docente defina su propia contraseña personal
    const tempPass = crypto.randomBytes(16).toString('hex') + 'Aa1!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPass, salt);

    // 1. Crear usuario con rol 'Docente', cuenta_activada en false y estado inicial 'Pendiente'
    // (El estado 'Pendiente' sirve como llave para que el docente pueda verificar su alta con CURP y correo)
    const userRes = await db.query(
      `INSERT INTO usuario (id_escuela, nombre, apellidos, correo, contrasena, rol, estado, fecha_registro, es_principal, cuenta_activada)
       VALUES ($1, $2, $3, $4, $5, 'Docente', 'Pendiente', CURRENT_TIMESTAMP, false, false)
       RETURNING id_usuario`,
      [id_escuela, nombre.trim(), (apellidos || '').trim(), trimmedEmail, hash]
    );

    const id_usuario = userRes.rows[0].id_usuario;

    // 2. Crear docente con estado inicial 'Pendiente'
    const docenteRes = await db.query(
      `INSERT INTO docentes (id_usuario, id_escuela, curp, especialidad, telefono, estado)
       VALUES ($1, $2, $3, $4, $5, 'Pendiente')
       RETURNING *`,
      [
        id_usuario,
        id_escuela,
        cleanCurp,
        (especialidad || '').trim(),
        (telefono || '').trim(),
      ]
    );

    // 3. Enviar correo de alta al docente con botón para verificar CURP y crear su contraseña
    let emailStatus = null;
    try {
      emailStatus = await enviarCorreoAltaDocente({
        destinatario: trimmedEmail,
        nombreDocente: `${nombre.trim()} ${(apellidos || '').trim()}`.trim(),
        escuelaNombre: nombreEscuela,
        curp: cleanCurp,
      });
    } catch (mailErr) {
      console.error('Error al enviar correo al docente:', mailErr);
      emailStatus = { sent: false, error: mailErr.message };
    }

    return res.json({
      success: true,
      message: emailStatus?.sent
        ? 'Docente registrado exitosamente. Se ha enviado un correo con el enlace para verificar su CURP y crear su contraseña.'
        : 'Docente registrado exitosamente. (Aviso de correo: ' + (emailStatus?.error || 'Pendiente de envío') + ')',
      docente: docenteRes.rows[0],
      emailStatus,
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/docentes:', err);
    return res.status(500).json({ success: false, message: 'Error al registrar docente.' });
  }
});

// Importar docentes en lote desde CSV
router.post('/docentes/batch', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { docentes } = req.body;

    if (!Array.isArray(docentes) || docentes.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron docentes para importar.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let creados = 0;
    const errores = [];

    // Consultar nombre de la escuela para los correos
    const escRes = await db.query(`SELECT nombre_escuela FROM escuelas WHERE id_escuela = $1`, [id_escuela]);
    const nombreEscuela = escRes.rows.length > 0 ? escRes.rows[0].nombre_escuela : 'Escuela SICARA';

    // Pre-generar un salt
    const salt = await bcrypt.genSalt(10);

    for (let i = 0; i < docentes.length; i++) {
      const d = docentes[i];
      const fila = d._rowNumber || i + 2;

      const nombre = (d.nombre || '').trim();
      const apellidos = (d.apellidos || '').trim();
      const correo = (d.correo || d.email || '').trim().toLowerCase();
      const curp = d.curp ? d.curp.trim().toUpperCase() : null;
      const especialidad = (d.especialidad || '').trim();
      const telefono = (d.telefono || '').trim();
      const estado = d.estado ? d.estado.trim() : 'Activo';

      if (!nombre) {
        errores.push({ fila, error: 'El nombre es obligatorio.' });
        continue;
      }
      if (!correo || !emailRegex.test(correo)) {
        errores.push({ fila, error: `Correo "${correo}" inválido.` });
        continue;
      }

      // Validar si el correo ya existe
      const checkCorreo = await db.query(`SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1`, [correo]);
      if (checkCorreo.rows.length > 0) {
        errores.push({ fila, error: `El correo "${correo}" ya se encuentra registrado.` });
        continue;
      }

      try {
        // Asignar contraseña temporal segura
        const tempPass = crypto.randomBytes(16).toString('hex') + 'Aa1!';
        const passwordHash = await bcrypt.hash(tempPass, salt);

        const userRes = await db.query(
          `INSERT INTO usuario (nombre, apellidos, correo, contrasena, rol, id_escuela, estado, fecha_registro, cuenta_activada)
           VALUES ($1, $2, $3, $4, 'Docente', $5, 'Pendiente', NOW(), FALSE)
           RETURNING id_usuario`,
          [nombre, apellidos, correo, passwordHash, id_escuela]
        );
        const id_usuario = userRes.rows[0].id_usuario;

        await db.query(
          `INSERT INTO docentes (id_usuario, id_escuela, curp, especialidad, telefono, estado)
           VALUES ($1, $2, $3, $4, $5, 'Pendiente')`,
          [id_usuario, id_escuela, curp, especialidad, telefono]
        );

        // Despachar correo de alta al docente con el botón de verificación por CURP
        try {
          await enviarCorreoAltaDocente({
            destinatario: correo,
            nombreDocente: `${nombre} ${apellidos}`.trim(),
            escuelaNombre: nombreEscuela,
            curp,
          });
        } catch (mailErr) {
          console.error(`Error enviando correo a docente en fila ${fila}:`, mailErr.message);
        }

        creados++;
      } catch (rowErr) {
        errores.push({ fila, error: rowErr.message || 'Error al guardar docente.' });
      }
    }

    return res.json({
      success: true,
      message: `Se importaron ${creados} de ${docentes.length} docentes correctamente.`,
      creados,
      total: docentes.length,
      errores,
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/docentes/batch:', err);
    return res.status(500).json({ success: false, message: 'Error al importar docentes en lote.' });
  }
});

router.put('/docentes/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;
    const { nombre, apellidos, curp, especialidad, telefono, estado, contrasena } = req.body;

    // Verificar docente
    const docRes = await db.query(
      `SELECT d.*, u.id_usuario FROM docentes d JOIN usuario u ON d.id_usuario = u.id_usuario WHERE d.id_docente = $1 AND d.id_escuela = $2`,
      [id, id_escuela]
    );
    if (docRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Docente no encontrado en esta institución.' });
    }

    const { id_usuario } = docRes.rows[0];

    // Actualizar usuario
    if (contrasena && contrasena.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(contrasena.trim(), salt);
      await db.query(
        `UPDATE usuario 
         SET nombre = $1, apellidos = $2, contrasena = $3, estado = $4 
         WHERE id_usuario = $5`,
        [nombre.trim(), (apellidos || '').trim(), hash, estado || 'Activo', id_usuario]
      );
    } else {
      await db.query(
        `UPDATE usuario 
         SET nombre = $1, apellidos = $2, estado = $3 
         WHERE id_usuario = $4`,
        [nombre.trim(), (apellidos || '').trim(), estado || 'Activo', id_usuario]
      );
    }

    // Actualizar datos de docente
    const updatedDoc = await db.query(
      `UPDATE docentes
       SET curp = $1, especialidad = $2, telefono = $3, estado = $4
       WHERE id_docente = $5 AND id_escuela = $6
       RETURNING *`,
      [
        curp ? curp.trim().toUpperCase() : null,
        (especialidad || '').trim(),
        (telefono || '').trim(),
        estado || 'Activo',
        id,
        id_escuela,
      ]
    );

    return res.json({
      success: true,
      message: 'Información del docente actualizada exitosamente.',
      docente: updatedDoc.rows[0],
    });
  } catch (err) {
    console.error('Error en PUT /api/directivo/docentes/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar docente.' });
  }
});

// Reenviar correo de alta e instrucciones de CURP al docente
router.post('/docentes/:id/reenviar-correo', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const docRes = await db.query(
      `SELECT d.id_docente, d.curp, u.id_usuario, u.nombre, u.apellidos, u.correo,
              e.nombre_escuela
       FROM docentes d
       JOIN usuario u ON d.id_usuario = u.id_usuario
       JOIN escuelas e ON d.id_escuela = e.id_escuela
       WHERE d.id_docente = $1 AND d.id_escuela = $2`,
      [id, id_escuela]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Docente no encontrado en este plantel.' });
    }

    const doc = docRes.rows[0];
    const emailRes = await enviarCorreoAltaDocente({
      destinatario: doc.correo,
      nombreDocente: `${doc.nombre} ${doc.apellidos || ''}`.trim(),
      escuelaNombre: doc.nombre_escuela,
      curp: doc.curp,
    });

    if (!emailRes.sent) {
      return res.status(500).json({
        success: false,
        message: emailRes.error || 'No se pudo enviar el correo al docente. Verifique la configuración SMTP.',
      });
    }

    return res.json({
      success: true,
      message: `Correo de verificación de alta reenviado correctamente a ${doc.correo}.`,
    });
  } catch (err) {
    console.error('Error al reenviar correo al docente:', err);
    return res.status(500).json({ success: false, message: 'Error interno al reenviar correo al docente.' });
  }
});

// Asignaciones del docente (grupos y materias)
router.get('/docentes/:id/asignaciones', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const asignaciones = await db.query(
      `SELECT gd.id_grupo_docente, gd.id_grupo, gd.id_materia,
              g.nombre_grupo, g.grado, g.ciclo_escolar,
              m.nombre_materia, m.descripcion AS materia_desc
       FROM grupo_docente gd
       JOIN grupo g ON gd.id_grupo = g.id_grupo
       JOIN materia m ON gd.id_materia = m.id_materia
       WHERE gd.id_docente = $1 AND g.id_escuela = $2
       ORDER BY g.grado ASC, g.nombre_grupo ASC, m.nombre_materia ASC`,
      [id, id_escuela]
    );

    return res.json({ success: true, asignaciones: asignaciones.rows });
  } catch (err) {
    console.error('Error al consultar asignaciones de docente:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener asignaciones.' });
  }
});

// ==========================================
// 4. MÓDULO DE GRUPOS
// ==========================================
router.get('/grupos', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { q, grado, ciclo_escolar } = req.query;

    let query = `
      SELECT g.id_grupo, g.id_escuela, g.nombre_grupo, g.grado, g.ciclo_escolar, g.estado,
             COUNT(DISTINCT ga.id_alumno)::int AS total_alumnos,
             COUNT(DISTINCT gd.id_docente)::int AS total_docentes,
             COUNT(DISTINCT gd.id_materia)::int AS total_materias
      FROM grupo g
      LEFT JOIN grupo_alumno ga ON g.id_grupo = ga.id_grupo AND (ga.estado IS NULL OR ga.estado = 'Activo')
      LEFT JOIN grupo_docente gd ON g.id_grupo = gd.id_grupo
      WHERE g.id_escuela = $1
    `;
    const params = [id_escuela];

    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      query += ` AND LOWER(g.nombre_grupo) LIKE $${params.length}`;
    }

    if (grado && grado !== 'todos') {
      const cleanGrado = grado.toString().trim().replace(/º|°/g, '');
      params.push(`%${cleanGrado}%`);
      query += ` AND (g.grado = $${params.length} OR REPLACE(REPLACE(g.grado, 'º', ''), '°', '') LIKE $${params.length})`;
    }

    if (ciclo_escolar) {
      params.push(ciclo_escolar);
      query += ` AND g.ciclo_escolar = $${params.length}`;
    }

    query += ` AND (g.estado IS NULL OR g.estado != 'Inactivo')`;

    query += ` GROUP BY g.id_grupo ORDER BY g.grado ASC, g.nombre_grupo ASC`;

    const result = await db.query(query, params);
    return res.json({ success: true, grupos: result.rows });
  } catch (err) {
    console.error('Error en GET /api/directivo/grupos:', err);
    return res.status(500).json({ success: false, message: 'Error al listar grupos.' });
  }
});

router.post('/grupos', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { nombre_grupo, grado, ciclo_escolar, estado } = req.body;

    if (!nombre_grupo || !nombre_grupo.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del grupo es obligatorio.' });
    }

    const result = await db.query(
      `INSERT INTO grupo (id_escuela, nombre_grupo, grado, ciclo_escolar, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id_escuela,
        nombre_grupo.trim(),
        (grado || '').toString().trim(),
        (ciclo_escolar || '2024-2025').trim(),
        estado || 'Activo',
      ]
    );

    return res.json({
      success: true,
      message: 'Grupo creado exitosamente.',
      grupo: result.rows[0],
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/grupos:', err);
    return res.status(500).json({ success: false, message: 'Error al registrar grupo.' });
  }
});

// Importar grupos en lote desde CSV
router.post('/grupos/batch', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { grupos } = req.body;

    if (!Array.isArray(grupos) || grupos.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron grupos para importar.' });
    }

    let creados = 0;
    const errores = [];

    for (let i = 0; i < grupos.length; i++) {
      const g = grupos[i];
      const fila = g._rowNumber || i + 2;

      const nombre_grupo = (g.nombre_grupo || g.grupo || g.nombre || '').trim();
      const grado = (g.grado !== undefined && g.grado !== null ? String(g.grado).trim() : '1');
      const ciclo_escolar = (g.ciclo_escolar || g.ciclo || '2024-2025').trim();
      const estado = g.estado ? g.estado.trim() : 'Activo';

      if (!nombre_grupo) {
        errores.push({ fila, error: 'El nombre del grupo es obligatorio.' });
        continue;
      }

      try {
        await db.query(
          `INSERT INTO grupo (id_escuela, nombre_grupo, grado, ciclo_escolar, estado)
           VALUES ($1, $2, $3, $4, $5)`,
          [id_escuela, nombre_grupo, grado, ciclo_escolar, estado]
        );
        creados++;
      } catch (rowErr) {
        errores.push({ fila, error: rowErr.message || 'Error al guardar grupo.' });
      }
    }

    return res.json({
      success: true,
      message: `Se importaron ${creados} de ${grupos.length} grupos correctamente.`,
      creados,
      total: grupos.length,
      errores,
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/grupos/batch:', err);
    return res.status(500).json({ success: false, message: 'Error al importar grupos en lote.' });
  }
});

router.put('/grupos/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;
    const { nombre_grupo, grado, ciclo_escolar, estado } = req.body;

    const check = await db.query(`SELECT * FROM grupo WHERE id_grupo = $1 AND id_escuela = $2`, [id, id_escuela]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    const result = await db.query(
      `UPDATE grupo
       SET nombre_grupo = $1, grado = $2, ciclo_escolar = $3, estado = $4
       WHERE id_grupo = $5 AND id_escuela = $6
       RETURNING *`,
      [
        nombre_grupo.trim(),
        (grado || '').toString().trim(),
        (ciclo_escolar || '').trim(),
        estado || 'Activo',
        id,
        id_escuela,
      ]
    );

    return res.json({
      success: true,
      message: 'Grupo actualizado correctamente.',
      grupo: result.rows[0],
    });
  } catch (err) {
    console.error('Error en PUT /api/directivo/grupos/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar grupo.' });
  }
});

// Detalle del grupo (alumnos inscritos + asignaciones docentes/materias)
router.get('/grupos/:id/detalle', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const grupoCheck = await db.query(
      `SELECT * FROM grupo WHERE id_grupo = $1 AND id_escuela = $2`,
      [id, id_escuela]
    );
    if (grupoCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    // Alumnos del grupo
    const alumnos = await db.query(
      `SELECT a.id_alumno, a.nombre, a.apellidos, a.curp, a.estado AS estado_alumno,
              ga.id_grupo_alumno, ga.fecha_inscripcion, ga.estado AS estado_inscripcion
       FROM grupo_alumno ga
       JOIN alumnos a ON ga.id_alumno = a.id_alumno
       WHERE ga.id_grupo = $1
       ORDER BY a.apellidos ASC NULLS LAST, a.nombre ASC`,
      [id]
    );

    // Asignaciones docentes y materias
    const asignaciones = await db.query(
      `SELECT gd.id_grupo_docente, gd.id_docente, gd.id_materia,
              u.nombre || ' ' || COALESCE(u.apellidos, '') AS docente_nombre,
              d.especialidad,
              m.nombre_materia
       FROM grupo_docente gd
       JOIN docentes d ON gd.id_docente = d.id_docente
       JOIN usuario u ON d.id_usuario = u.id_usuario
       JOIN materia m ON gd.id_materia = m.id_materia
       WHERE gd.id_grupo = $1
       ORDER BY m.nombre_materia ASC`,
      [id]
    );

    return res.json({
      success: true,
      grupo: grupoCheck.rows[0],
      alumnos: alumnos.rows,
      asignaciones: asignaciones.rows,
    });
  } catch (err) {
    console.error('Error en detalle de grupo:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener detalle del grupo.' });
  }
});

// Inscribir alumno en grupo
router.post('/grupos/:id/inscribir', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params; // id_grupo
    const { id_alumno } = req.body;

    if (!id_alumno) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar un alumno.' });
    }

    // Validar grupo
    const grupoRes = await db.query(`SELECT * FROM grupo WHERE id_grupo = $1 AND id_escuela = $2`, [id, id_escuela]);
    if (grupoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo no válido.' });
    }
    const grupo = grupoRes.rows[0];

    // Validar que el alumno pertenezca a la escuela
    const alumnoRes = await db.query(`SELECT * FROM alumnos WHERE id_alumno = $1 AND id_escuela = $2`, [id_alumno, id_escuela]);
    if (alumnoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'El alumno no pertenece a esta escuela.' });
    }

    // Validar si el alumno ya está inscrito en este grupo
    const existing = await db.query(
      `SELECT ga.*, g.ciclo_escolar 
       FROM grupo_alumno ga 
       JOIN grupo g ON ga.id_grupo = g.id_grupo 
       WHERE ga.id_alumno = $1 AND ga.id_grupo = $2`,
      [id_alumno, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `El alumno ya se encuentra inscrito en este grupo (${grupo.nombre_grupo}).`,
      });
    }

    // Inscribir
    await db.query(
      `INSERT INTO grupo_alumno (id_grupo, id_alumno, fecha_inscripcion, estado)
       VALUES ($1, $2, CURRENT_DATE, 'Activo')`,
      [id, id_alumno]
    );

    return res.json({ success: true, message: 'Alumno inscrito al grupo correctamente.' });
  } catch (err) {
    console.error('Error al inscribir alumno en grupo:', err);
    return res.status(500).json({ success: false, message: 'Error al procesar inscripción.' });
  }
});

// Remover alumno de grupo
router.delete('/grupos/:id/alumnos/:id_alumno', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id, id_alumno } = req.params;

    // Verificar que el grupo pertenezca a la escuela
    const grupoRes = await db.query(`SELECT id_grupo FROM grupo WHERE id_grupo = $1 AND id_escuela = $2`, [id, id_escuela]);
    if (grupoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    await db.query(`DELETE FROM grupo_alumno WHERE id_grupo = $1 AND id_alumno = $2`, [id, id_alumno]);
    return res.json({ success: true, message: 'Alumno desvinculado del grupo exitosamente.' });
  } catch (err) {
    console.error('Error al remover alumno del grupo:', err);
    return res.status(500).json({ success: false, message: 'Error al remover alumno.' });
  }
});

// ==========================================
// 5. MÓDULO DE MATERIAS & ASIGNACIONES
// ==========================================
router.get('/materias', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { q, estado, id_grupo, grado } = req.query;

    let query = `
      SELECT m.id_materia, m.nombre_materia, m.descripcion, m.estado, m.id_escuela,
             COUNT(DISTINCT gd.id_grupo)::int AS total_grupos_asignados,
             COUNT(DISTINCT gd.id_docente)::int AS total_docentes_asignados,
             COALESCE(
               JSON_AGG(
                 DISTINCT jsonb_build_object(
                   'id_grupo', g.id_grupo,
                   'nombre_grupo', g.nombre_grupo,
                   'grado', g.grado,
                   'id_docente', d.id_docente,
                   'docente_nombre', TRIM(CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')))
                 )
               ) FILTER (WHERE g.id_grupo IS NOT NULL),
               '[]'::json
             ) AS grupos_asignados
      FROM materia m
      LEFT JOIN grupo_docente gd ON m.id_materia = gd.id_materia
      LEFT JOIN grupo g ON gd.id_grupo = g.id_grupo AND g.id_escuela = $1
      LEFT JOIN docentes d ON gd.id_docente = d.id_docente
      LEFT JOIN usuario u ON d.id_usuario = u.id_usuario
      WHERE (m.id_escuela = $1 OR m.id_escuela IS NULL)
    `;
    const params = [id_escuela];

    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      query += ` AND LOWER(m.nombre_materia) LIKE $${params.length}`;
    }

    if (estado && estado !== 'todos') {
      params.push(estado);
      query += ` AND m.estado = $${params.length}`;
    } else if (!estado) {
      query += ` AND (m.estado IS NULL OR m.estado != 'Inactivo')`;
    }

    if (id_grupo) {
      params.push(id_grupo);
      query += ` AND gd.id_grupo = $${params.length}`;
    }

    if (grado) {
      const cleanGrado = grado.toString().trim().replace(/º|°/g, '');
      params.push(`%${cleanGrado}%`);
      query += ` AND (g.grado = $${params.length} OR REPLACE(REPLACE(g.grado, 'º', ''), '°', '') LIKE $${params.length})`;
    }

    query += ` GROUP BY m.id_materia ORDER BY m.nombre_materia ASC`;

    const result = await db.query(query, params);
    return res.json({ success: true, materias: result.rows });
  } catch (err) {
    console.error('Error en GET /api/directivo/materias:', err);
    return res.status(500).json({ success: false, message: 'Error al listar materias.' });
  }
});

router.post('/materias', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { nombre_materia, descripcion, estado } = req.body;

    if (!nombre_materia || !nombre_materia.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la materia es obligatorio.' });
    }

    const result = await db.query(
      `INSERT INTO materia (nombre_materia, descripcion, estado, id_escuela)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre_materia.trim(), (descripcion || '').trim(), estado || 'Activo', id_escuela]
    );

    return res.json({
      success: true,
      message: 'Materia registrada exitosamente.',
      materia: result.rows[0],
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/materias:', err);
    return res.status(500).json({ success: false, message: 'Error al registrar materia.' });
  }
});

// Importar materias en lote desde CSV
router.post('/materias/batch', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { materias } = req.body;

    if (!Array.isArray(materias) || materias.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron materias para importar.' });
    }

    let creados = 0;
    const errores = [];

    for (let i = 0; i < materias.length; i++) {
      const m = materias[i];
      const fila = m._rowNumber || i + 2;

      const nombre_materia = (m.nombre_materia || m.materia || m.nombre || '').trim();
      const descripcion = (m.descripcion || '').trim();
      const estado = m.estado ? m.estado.trim() : 'Activo';

      if (!nombre_materia) {
        errores.push({ fila, error: 'El nombre de la materia es obligatorio.' });
        continue;
      }

      try {
        await db.query(
          `INSERT INTO materia (nombre_materia, descripcion, estado, id_escuela)
           VALUES ($1, $2, $3, $4)`,
          [nombre_materia, descripcion, estado, id_escuela]
        );
        creados++;
      } catch (rowErr) {
        errores.push({ fila, error: rowErr.message || 'Error al guardar materia.' });
      }
    }

    return res.json({
      success: true,
      message: `Se importaron ${creados} de ${materias.length} materias correctamente.`,
      creados,
      total: materias.length,
      errores,
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/materias/batch:', err);
    return res.status(500).json({ success: false, message: 'Error al importar materias en lote.' });
  }
});

router.put('/materias/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;
    const { nombre_materia, descripcion, estado } = req.body;

    const check = await db.query(
      `SELECT * FROM materia WHERE id_materia = $1 AND (id_escuela = $2 OR id_escuela IS NULL)`,
      [id, id_escuela]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada.' });
    }

    const result = await db.query(
      `UPDATE materia
       SET nombre_materia = $1, descripcion = $2, estado = $3
       WHERE id_materia = $4
       RETURNING *`,
      [nombre_materia.trim(), (descripcion || '').trim(), estado || 'Activo', id]
    );

    return res.json({
      success: true,
      message: 'Materia actualizada exitosamente.',
      materia: result.rows[0],
    });
  } catch (err) {
    console.error('Error en PUT /api/directivo/materias/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar materia.' });
  }
});

// Asignar docente y materia a un grupo
router.post('/asignaciones', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id_grupo, id_docente, id_materia } = req.body;

    if (!id_grupo || !id_docente || !id_materia) {
      return res.status(400).json({ success: false, message: 'Grupo, docente y materia son obligatorios.' });
    }

    // Validar pertenencia del grupo a la escuela
    const gCheck = await db.query(`SELECT id_grupo FROM grupo WHERE id_grupo = $1 AND id_escuela = $2`, [id_grupo, id_escuela]);
    if (gCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'El grupo no pertenece a su escuela.' });
    }

    // Validar pertenencia del docente a la escuela
    const dCheck = await db.query(`SELECT id_docente FROM docentes WHERE id_docente = $1 AND id_escuela = $2`, [id_docente, id_escuela]);
    if (dCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'El docente no pertenece a su escuela.' });
    }

    // Validar si ya existe la asignación exacta
    const exist = await db.query(
      `SELECT * FROM grupo_docente WHERE id_grupo = $1 AND id_docente = $2 AND id_materia = $3`,
      [id_grupo, id_docente, id_materia]
    );
    if (exist.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Esta asignación de materia y docente para el grupo ya existe.' });
    }

    const insert = await db.query(
      `INSERT INTO grupo_docente (id_grupo, id_docente, id_materia)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id_grupo, id_docente, id_materia]
    );

    return res.json({
      success: true,
      message: 'Asignación académica registrada exitosamente.',
      asignacion: insert.rows[0],
    });
  } catch (err) {
    console.error('Error en POST /api/directivo/asignaciones:', err);
    return res.status(500).json({ success: false, message: 'Error al registrar asignación.' });
  }
});

// Eliminar asignación académica
router.delete('/asignaciones/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    // Verificar que pertenezca a un grupo de la escuela
    const check = await db.query(
      `SELECT gd.id_grupo_docente 
       FROM grupo_docente gd
       JOIN grupo g ON gd.id_grupo = g.id_grupo
       WHERE gd.id_grupo_docente = $1 AND g.id_escuela = $2`,
      [id, id_escuela]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada en su institución.' });
    }

    await db.query(`DELETE FROM grupo_docente WHERE id_grupo_docente = $1`, [id]);
    return res.json({ success: true, message: 'Asignación académica eliminada correctamente.' });
  } catch (err) {
    console.error('Error al eliminar asignación:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar asignación.' });
  }
});

// ==========================================
// 6. MÓDULO DE ALERTAS
// ==========================================
router.get('/alertas', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { estado, tipo, q } = req.query;

    let query = `
      SELECT al.id_alerta, al.id_escuela, al.id_alumno, al.tipo_alerta, al.descripcion,
             al.fecha_generacion, al.estado_alerta, al.observaciones,
             a.nombre || ' ' || COALESCE(a.apellidos, '') AS alumno_nombre,
             a.curp AS alumno_curp,
             g.nombre_grupo, g.grado
      FROM alerta al
      JOIN alumnos a ON al.id_alumno = a.id_alumno
      LEFT JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
      LEFT JOIN grupo g ON ga.id_grupo = g.id_grupo
      WHERE al.id_escuela = $1
    `;
    const params = [id_escuela];

    if (estado && estado !== 'todos') {
      params.push(estado);
      query += ` AND LOWER(al.estado_alerta) = LOWER($${params.length})`;
    }

    if (tipo && tipo !== 'todos') {
      params.push(tipo);
      query += ` AND al.tipo_alerta = $${params.length}`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      query += ` AND (LOWER(a.nombre) LIKE $${params.length} OR LOWER(COALESCE(a.apellidos, '')) LIKE $${params.length} OR LOWER(al.descripcion) LIKE $${params.length})`;
    }

    query += ` ORDER BY al.fecha_generacion DESC`;

    const result = await db.query(query, params);
    return res.json({ success: true, alertas: result.rows });
  } catch (err) {
    console.error('Error en GET /api/directivo/alertas:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar alertas.' });
  }
});

router.post('/alertas', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id_alumno, tipo_alerta, descripcion, observaciones, estado_alerta } = req.body;

    if (!id_alumno || !tipo_alerta || !descripcion) {
      return res.status(400).json({ success: false, message: 'Alumno, tipo de alerta y descripción son obligatorios.' });
    }

    // Validar alumno en escuela
    const aCheck = await db.query(`SELECT id_alumno FROM alumnos WHERE id_alumno = $1 AND id_escuela = $2`, [id_alumno, id_escuela]);
    if (aCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'El alumno no pertenece a su institución.' });
    }

    // Evitar duplicadas pendientes idénticas para el mismo alumno
    const dupCheck = await db.query(
      `SELECT id_alerta FROM alerta 
       WHERE id_alumno = $1 AND tipo_alerta = $2 AND LOWER(estado_alerta) NOT IN ('atendida', 'resuelta')`,
      [id_alumno, tipo_alerta]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una alerta activa de este mismo tipo para el alumno especificado.',
      });
    }

    const insert = await db.query(
      `INSERT INTO alerta (id_escuela, id_alumno, tipo_alerta, descripcion, fecha_generacion, estado_alerta, observaciones)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
       RETURNING *`,
      [id_escuela, id_alumno, tipo_alerta, descripcion.trim(), estado_alerta || 'Pendiente', (observaciones || '').trim()]
    );

    return res.json({
      success: true,
      message: 'Alerta generada exitosamente.',
      alerta: insert.rows[0],
    });
  } catch (err) {
    console.error('Error al registrar alerta:', err);
    return res.status(500).json({ success: false, message: 'Error al generar alerta.' });
  }
});

router.put('/alertas/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;
    const { estado_alerta, observaciones } = req.body;

    const check = await db.query(`SELECT * FROM alerta WHERE id_alerta = $1 AND id_escuela = $2`, [id, id_escuela]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada en su institución.' });
    }

    const update = await db.query(
      `UPDATE alerta
       SET estado_alerta = COALESCE($1, estado_alerta),
           observaciones = COALESCE($2, observaciones)
       WHERE id_alerta = $3 AND id_escuela = $4
       RETURNING *`,
      [estado_alerta, observaciones, id, id_escuela]
    );

    return res.json({
      success: true,
      message: 'Seguimiento de alerta actualizado.',
      alerta: update.rows[0],
    });
  } catch (err) {
    console.error('Error al actualizar alerta:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar alerta.' });
  }
});

// ==========================================
// 7. MÓDULO DE RENDIMIENTO ACADÉMICO
// ==========================================
router.get('/rendimiento', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id_grupo, grado, ciclo_escolar, periodo, q } = req.query;

    // Calculamos en tiempo real con datos de calificacion y asistencia para consistencia absoluta
    let query = `
      SELECT 
        a.id_alumno,
        a.nombre || ' ' || COALESCE(a.apellidos, '') AS alumno_nombre,
        a.curp,
        g.id_grupo,
        g.nombre_grupo,
        g.grado,
        g.ciclo_escolar,
        COALESCE(c.periodo, '1er Trimestre') AS periodo,
        ROUND(AVG(c.calificacion)::numeric, 1) AS promedio,
        ROUND(
          (COUNT(CASE WHEN LOWER(asi.estado_asistencia) IN ('presente', 'asistencia', 'asistio') THEN 1 END)::numeric / 
           NULLIF(COUNT(asi.id_asistencia), 0)::numeric * 100), 1
        ) AS porcentaje_asistencia,
        CASE 
          WHEN AVG(c.calificacion) >= 9.0 THEN 'Excelente'
          WHEN AVG(c.calificacion) >= 8.0 THEN 'Bueno'
          WHEN AVG(c.calificacion) >= 6.0 THEN 'Regular'
          WHEN AVG(c.calificacion) IS NOT NULL THEN 'En Riesgo'
          ELSE 'Sin Calificaciones'
        END AS nivel_rendimiento,
        MAX(c.fecha_registro) AS ultima_evaluacion
      FROM alumnos a
      JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
      JOIN grupo g ON ga.id_grupo = g.id_grupo
      LEFT JOIN calificacion c ON a.id_alumno = c.id_alumno AND g.id_grupo = c.id_grupo
      LEFT JOIN asistencia asi ON a.id_alumno = asi.id_alumno AND g.id_grupo = asi.id_grupo
      WHERE a.id_escuela = $1
    `;
    const params = [id_escuela];

    if (id_grupo) {
      params.push(id_grupo);
      query += ` AND g.id_grupo = $${params.length}`;
    }

    if (grado) {
      params.push(grado);
      query += ` AND g.grado = $${params.length}`;
    }

    if (ciclo_escolar) {
      params.push(ciclo_escolar);
      query += ` AND g.ciclo_escolar = $${params.length}`;
    }

    query += ` AND (g.estado IS NULL OR g.estado != 'Inactivo')`;

    if (periodo && periodo !== 'todos') {
      params.push(periodo);
      query += ` AND (c.periodo = $${params.length} OR c.periodo IS NULL)`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      query += ` AND (LOWER(a.nombre) LIKE $${params.length} OR LOWER(COALESCE(a.apellidos, '')) LIKE $${params.length})`;
    }

    query += `
      GROUP BY a.id_alumno, a.nombre, a.apellidos, a.curp, g.id_grupo, g.nombre_grupo, g.grado, g.ciclo_escolar, c.periodo
      ORDER BY g.grado ASC, g.nombre_grupo ASC, a.apellidos ASC NULLS LAST
    `;

    const result = await db.query(query, params);
    return res.json({ success: true, rendimiento: result.rows });
  } catch (err) {
    console.error('Error en /api/directivo/rendimiento:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar rendimiento académico.' });
  }
});

// ==========================================
// 8. MÓDULO DE REPORTES
// ==========================================
router.get('/reportes', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const result = await db.query(
      `SELECT r.id_reporte, r.id_escuela, r.id_usuario, r.tipo_reporte, r.periodo, 
              r.fecha_generacion, r.descripcion, r.archivo_nombre,
              u.nombre || ' ' || COALESCE(u.apellidos, '') AS generado_por
       FROM reporte r
       LEFT JOIN usuario u ON r.id_usuario = u.id_usuario
       WHERE r.id_escuela = $1
       ORDER BY r.fecha_generacion DESC`,
      [id_escuela]
    );

    return res.json({ success: true, reportes: result.rows });
  } catch (err) {
    console.error('Error en GET /api/directivo/reportes:', err);
    return res.status(500).json({ success: false, message: 'Error al listar historial de reportes.' });
  }
});

router.post('/reportes/generar', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const id_usuario = req.user.id_usuario;
    const { tipo_reporte, periodo, id_grupo, descripcion } = req.body;

    if (!tipo_reporte) {
      return res.status(400).json({ success: false, message: 'El tipo de reporte es obligatorio.' });
    }

    let datosReporte = {};

    switch (tipo_reporte) {
      case 'alumnos_general': {
        const query = await db.query(
          `SELECT a.id_alumno, a.nombre, a.apellidos, a.curp, a.fecha_nacimiento, a.estado,
                  g.nombre_grupo, g.grado, g.ciclo_escolar
           FROM alumnos a
           LEFT JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
           LEFT JOIN grupo g ON ga.id_grupo = g.id_grupo
           WHERE a.id_escuela = $1
           ORDER BY a.apellidos ASC NULLS LAST, a.nombre ASC`,
          [id_escuela]
        );
        datosReporte = { lista: query.rows, total: query.rows.length };
        break;
      }
      case 'docentes_general': {
        const query = await db.query(
          `SELECT d.id_docente, u.nombre, u.apellidos, u.correo, d.curp, d.especialidad, d.telefono, d.estado
           FROM docentes d
           JOIN usuario u ON d.id_usuario = u.id_usuario
           WHERE d.id_escuela = $1
           ORDER BY u.nombre ASC`,
          [id_escuela]
        );
        datosReporte = { lista: query.rows, total: query.rows.length };
        break;
      }
      case 'alumnos_por_grupo': {
        const query = await db.query(
          `SELECT a.id_alumno, a.nombre, a.apellidos, a.curp, g.nombre_grupo, g.grado, g.ciclo_escolar, ga.fecha_inscripcion
           FROM grupo_alumno ga
           JOIN alumnos a ON ga.id_alumno = a.id_alumno
           JOIN grupo g ON ga.id_grupo = g.id_grupo
           WHERE g.id_escuela = $1 ${id_grupo ? 'AND g.id_grupo = $2' : ''}
           ORDER BY g.grado ASC, g.nombre_grupo ASC, a.apellidos ASC NULLS LAST`,
          id_grupo ? [id_escuela, id_grupo] : [id_escuela]
        );
        datosReporte = { lista: query.rows, total: query.rows.length };
        break;
      }
      case 'asistencia':
      case 'inasistencias': {
        const query = await db.query(
          `SELECT asi.fecha, asi.estado_asistencia, asi.observaciones,
                  a.nombre || ' ' || COALESCE(a.apellidos, '') AS alumno_nombre,
                  g.nombre_grupo
           FROM asistencia asi
           JOIN alumnos a ON asi.id_alumno = a.id_alumno
           JOIN grupo g ON asi.id_grupo = g.id_grupo
           WHERE a.id_escuela = $1
             ${tipo_reporte === 'inasistencias' ? "AND LOWER(asi.estado_asistencia) IN ('inasistencia', 'falta', 'ausente')" : ''}
           ORDER BY asi.fecha DESC
           LIMIT 200`,
          [id_escuela]
        );
        datosReporte = { lista: query.rows, total: query.rows.length };
        break;
      }
      case 'calificaciones':
      case 'rendimiento_academico': {
        const query = await db.query(
          `SELECT c.periodo, c.calificacion, c.fecha_registro,
                  a.nombre || ' ' || COALESCE(a.apellidos, '') AS alumno_nombre,
                  m.nombre_materia,
                  g.nombre_grupo
           FROM calificacion c
           JOIN alumnos a ON c.id_alumno = a.id_alumno
           JOIN materia m ON c.id_materia = m.id_materia
           JOIN grupo g ON c.id_grupo = g.id_grupo
           WHERE a.id_escuela = $1
           ORDER BY c.fecha_registro DESC
           LIMIT 200`,
          [id_escuela]
        );
        datosReporte = { lista: query.rows, total: query.rows.length };
        break;
      }
      case 'alertas': {
        const query = await db.query(
          `SELECT al.tipo_alerta, al.descripcion, al.fecha_generacion, al.estado_alerta, al.observaciones,
                  a.nombre || ' ' || COALESCE(a.apellidos, '') AS alumno_nombre
           FROM alerta al
           JOIN alumnos a ON al.id_alumno = a.id_alumno
           WHERE al.id_escuela = $1
           ORDER BY al.fecha_generacion DESC`,
          [id_escuela]
        );
        datosReporte = { lista: query.rows, total: query.rows.length };
        break;
      }
      default:
        datosReporte = { lista: [], total: 0 };
    }

    // Registrar en tabla reporte
    const descText = descripcion || `Generación de reporte institucional: ${tipo_reporte} (${periodo || 'Periodo Actual'})`;
    const insert = await db.query(
      `INSERT INTO reporte (id_escuela, id_usuario, tipo_reporte, periodo, fecha_generacion, descripcion, datos_json)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
       RETURNING *`,
      [id_escuela, id_usuario, tipo_reporte, periodo || 'Actual', descText, JSON.stringify(datosReporte)]
    );

    return res.json({
      success: true,
      message: 'Reporte generado exitosamente.',
      reporte: insert.rows[0],
      datos: datosReporte,
    });
  } catch (err) {
    console.error('Error al generar reporte:', err);
    return res.status(500).json({ success: false, message: 'Error al generar el reporte.' });
  }
});

// ==========================================
// 9. CONFIGURACIÓN INSTITUCIONAL
// ==========================================
router.get('/configuracion', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const result = await db.query(
      `SELECT id_escuela, nombre_escuela, cct, nivel_educativo, turno, direccion, municipio, estado,
              codigo_postal, telefono, correo_institucional, estado_escuela,
              color_primario, color_secundario, color_complementario, tipo_logo,
              (logo_escuela IS NOT NULL) AS tiene_logo
       FROM escuelas
       WHERE id_escuela = $1`,
      [id_escuela]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Escuela no encontrada.' });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      escuela: {
        ...row,
        color_primario: row.color_primario || '#722F37',
        color_secundario: row.color_secundario || '#4A1722',
        color_complementario: row.color_complementario || '#A64D5A',
      },
    });
  } catch (err) {
    console.error('Error en GET /api/directivo/configuracion:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener configuración institucional.' });
  }
});

// Guardar configuración institucional (nombre visible, colores, logo)
router.put('/configuracion', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { nombre_escuela, color_primario, color_secundario, color_complementario, logoBase64, tipo_logo, eliminar_logo } = req.body;

    if (!nombre_escuela || !nombre_escuela.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre institucional es obligatorio.' });
    }

    let logoBuffer = null;
    if (logoBase64 && typeof logoBase64 === 'string') {
      const base64Data = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
      try {
        logoBuffer = Buffer.from(base64Data, 'base64');
      } catch (errB64) {
        console.error('Error al decodificar buffer base64 de logotipo:', errB64);
      }
    }

    if (eliminar_logo) {
      await db.query(
        `UPDATE escuelas
         SET nombre_escuela = $1,
             color_primario = COALESCE($2, color_primario),
             color_secundario = COALESCE($3, color_secundario),
             color_complementario = COALESCE($4, color_complementario),
             logo_escuela = NULL,
             tipo_logo = NULL
         WHERE id_escuela = $5`,
        [
          nombre_escuela.trim(),
          color_primario || '#722F37',
          color_secundario || '#4A1722',
          color_complementario || '#A64D5A',
          id_escuela,
        ]
      );
    } else if (logoBuffer && logoBuffer.length > 0) {
      await db.query(
        `UPDATE escuelas
         SET nombre_escuela = $1,
             color_primario = COALESCE($2, color_primario),
             color_secundario = COALESCE($3, color_secundario),
             color_complementario = COALESCE($4, color_complementario),
             logo_escuela = $5,
             tipo_logo = $6
         WHERE id_escuela = $7`,
        [
          nombre_escuela.trim(),
          color_primario || '#722F37',
          color_secundario || '#4A1722',
          color_complementario || '#A64D5A',
          logoBuffer,
          tipo_logo || 'image/png',
          id_escuela,
        ]
      );
    } else {
      await db.query(
        `UPDATE escuelas
         SET nombre_escuela = $1,
             color_primario = COALESCE($2, color_primario),
             color_secundario = COALESCE($3, color_secundario),
             color_complementario = COALESCE($4, color_complementario)
         WHERE id_escuela = $5`,
        [
          nombre_escuela.trim(),
          color_primario || '#722F37',
          color_secundario || '#4A1722',
          color_complementario || '#A64D5A',
          id_escuela,
        ]
      );
    }

    const updated = await db.query(
      `SELECT id_escuela, nombre_escuela, cct, nivel_educativo, turno,
              color_primario, color_secundario, color_complementario, tipo_logo,
              (logo_escuela IS NOT NULL) AS tiene_logo
       FROM escuelas WHERE id_escuela = $1`,
      [id_escuela]
    );

    return res.json({
      success: true,
      message: 'Configuración institucional guardada exitosamente.',
      escuela: updated.rows[0],
    });
  } catch (err) {
    console.error('Error al actualizar configuración institucional:', err);
    return res.status(500).json({ success: false, message: 'Error al guardar configuración.' });
  }
});

// ==========================================
// 8. IMPORTACIÓN INTEGRAL DE TODA LA ESCUELA (CSV RELACIONAL)
// Procesa en una sola transacción:
// - Grupos
// - Materias
// - Docentes (con estado Pendiente y envío de correo)
// - Alumnos (con vinculación a su grupo)
// - Relaciones Curriculares (Grupo + Materia + Docente)
// ==========================================
router.post('/importar-integral', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const id_escuela = req.user.id_escuela;
    const { grupos = [], materias = [], docentes = [], alumnos = [], relaciones = [] } = req.body;

    // Obtener nombre de la escuela para el correo de los docentes
    const escRes = await client.query(`SELECT nombre_escuela FROM escuelas WHERE id_escuela = $1`, [id_escuela]);
    const nombreEscuela = escRes.rows.length > 0 ? escRes.rows[0].nombre_escuela : 'Escuela SICARA';

    await client.query('BEGIN');

    const creados = {
      grupos: 0,
      materias: 0,
      docentes: 0,
      alumnos: 0,
      relaciones: 0,
    };
    const errores = [];

    // Mapas para resolver referencias por nombre o identificador
    // key: nombre normalizado -> id_uuid
    const gruposMap = new Map();
    const materiasMap = new Map();
    const docentesMap = new Map(); // por nombre o correo o curp

    // 1. CARGAR GRUPOS EXISTENTES DE LA ESCUELA
    const existGrupos = await client.query(`SELECT id_grupo, LOWER(TRIM(nombre_grupo)) as nom FROM grupo WHERE id_escuela = $1`, [id_escuela]);
    existGrupos.rows.forEach(r => gruposMap.set(r.nom, r.id_grupo));

    // 2. INSERTAR NUEVOS GRUPOS
    for (let i = 0; i < grupos.length; i++) {
      const g = grupos[i];
      const fila = g._rowNumber || i + 2;
      const nombre_grupo = (g.nombre_grupo || g.grupo || g.nombre || '').trim();
      const grado = (g.grado || '1').toString().trim();
      const ciclo_escolar = (g.ciclo_escolar || g.ciclo || '2024-2025').trim();
      const estado = g.estado ? g.estado.trim() : 'Activo';

      if (!nombre_grupo) {
        errores.push({ seccion: 'Grupos', fila, error: 'Nombre de grupo obligatorio.' });
        continue;
      }

      const key = nombre_grupo.toLowerCase();
      if (!gruposMap.has(key)) {
        try {
          const ins = await client.query(
            `INSERT INTO grupo (id_escuela, nombre_grupo, grado, ciclo_escolar, estado)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id_grupo`,
            [id_escuela, nombre_grupo, grado, ciclo_escolar, estado]
          );
          gruposMap.set(key, ins.rows[0].id_grupo);
          creados.grupos++;
        } catch (err) {
          errores.push({ seccion: 'Grupos', fila, error: err.message });
        }
      }
    }

    // 3. CARGAR MATERIAS EXISTENTES
    const existMaterias = await client.query(`SELECT id_materia, LOWER(TRIM(nombre_materia)) as nom FROM materia WHERE id_escuela = $1 OR id_escuela IS NULL`, [id_escuela]);
    existMaterias.rows.forEach(r => materiasMap.set(r.nom, r.id_materia));

    // 4. INSERTAR NUEVAS MATERIAS
    for (let i = 0; i < materias.length; i++) {
      const m = materias[i];
      const fila = m._rowNumber || i + 2;
      const nombre_materia = (m.nombre_materia || m.materia || m.nombre || '').trim();
      const descripcion = (m.descripcion || '').trim();
      const estado = m.estado ? m.estado.trim() : 'Activo';

      if (!nombre_materia) {
        errores.push({ seccion: 'Materias', fila, error: 'Nombre de materia obligatorio.' });
        continue;
      }

      const key = nombre_materia.toLowerCase();
      if (!materiasMap.has(key)) {
        try {
          const ins = await client.query(
            `INSERT INTO materia (nombre_materia, descripcion, estado, id_escuela)
             VALUES ($1, $2, $3, $4)
             RETURNING id_materia`,
            [nombre_materia, descripcion, estado, id_escuela]
          );
          materiasMap.set(key, ins.rows[0].id_materia);
          creados.materias++;
        } catch (err) {
          errores.push({ seccion: 'Materias', fila, error: err.message });
        }
      }
    }

    // 5. CARGAR DOCENTES EXISTENTES
    const existDocentes = await client.query(
      `SELECT d.id_docente, LOWER(TRIM(u.correo)) as correo, UPPER(TRIM(COALESCE(d.curp, ''))) as curp,
              LOWER(TRIM(CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')))) as nombre_completo,
              LOWER(TRIM(u.nombre)) as nombre_solo
       FROM docentes d
       JOIN usuario u ON d.id_usuario = u.id_usuario
       WHERE d.id_escuela = $1`,
      [id_escuela]
    );
    existDocentes.rows.forEach(r => {
      if (r.correo) docentesMap.set(r.correo, r.id_docente);
      if (r.curp) docentesMap.set(r.curp, r.id_docente);
      if (r.nombre_completo) docentesMap.set(r.nombre_completo, r.id_docente);
      if (r.nombre_solo) docentesMap.set(r.nombre_solo, r.id_docente);
    });

    // 6. INSERTAR NUEVOS DOCENTES (Estado Pendiente)
    const emailsAEnviar = [];
    const salt = await bcrypt.genSalt(10);

    for (let i = 0; i < docentes.length; i++) {
      const d = docentes[i];
      const fila = d._rowNumber || i + 2;

      const nombre = (d.nombre || d.nombres || '').trim();
      const apellidos = (d.apellidos || d.apellido || '').trim();
      const correo = (d.correo || d.email || '').trim().toLowerCase();
      const curp = (d.curp || '').trim().toUpperCase();
      const especialidad = (d.especialidad || '').trim();
      const telefono = (d.telefono || '').trim();

      if (!nombre) {
        errores.push({ seccion: 'Docentes', fila, error: 'Nombre del docente obligatorio.' });
        continue;
      }
      if (!correo || !correo.includes('@')) {
        errores.push({ seccion: 'Docentes', fila, error: `Correo "${correo}" inválido.` });
        continue;
      }

      if (docentesMap.has(correo)) {
        continue; // Ya existe registrado
      }

      try {
        const tempPass = crypto.randomBytes(16).toString('hex') + 'Aa1!';
        const passwordHash = await bcrypt.hash(tempPass, salt);

        const uRes = await client.query(
          `INSERT INTO usuario (nombre, apellidos, correo, contrasena, rol, id_escuela, estado, fecha_registro, cuenta_activada)
           VALUES ($1, $2, $3, $4, 'Docente', $5, 'Pendiente', NOW(), FALSE)
           RETURNING id_usuario`,
          [nombre, apellidos, correo, passwordHash, id_escuela]
        );
        const id_usuario = uRes.rows[0].id_usuario;

        const docRes = await client.query(
          `INSERT INTO docentes (id_usuario, id_escuela, curp, especialidad, telefono, estado)
           VALUES ($1, $2, $3, $4, $5, 'Pendiente')
           RETURNING id_docente`,
          [id_usuario, id_escuela, curp || null, especialidad, telefono]
        );
        const id_docente = docRes.rows[0].id_docente;

        // Registrar en el mapa
        docentesMap.set(correo, id_docente);
        if (curp) docentesMap.set(curp, id_docente);
        const nomComp = `${nombre} ${apellidos}`.trim().toLowerCase();
        docentesMap.set(nomComp, id_docente);
        docentesMap.set(nombre.toLowerCase(), id_docente);

        creados.docentes++;

        emailsAEnviar.push({
          correo,
          nombreCompleto: `${nombre} ${apellidos}`.trim(),
          curp,
        });
      } catch (dErr) {
        errores.push({ seccion: 'Docentes', fila, error: dErr.message });
      }
    }

    // 7. INSERTAR ALUMNOS Y VINCULARLOS A SU GRUPO
    for (let i = 0; i < alumnos.length; i++) {
      const a = alumnos[i];
      const fila = a._rowNumber || i + 2;

      const nombre = (a.nombre || a.nombres || '').trim();
      const apellidos = (a.apellidos || a.apellido || '').trim();
      const curp = (a.curp || '').trim().toUpperCase();
      const fecha_nacimiento = a.fecha_nacimiento || a.nacimiento || null;
      const estado = a.estado ? a.estado.trim() : 'Activo';
      const grupoRef = (a.grupo || a.nombre_grupo || '').trim().toLowerCase();

      if (!nombre) {
        errores.push({ seccion: 'Alumnos', fila, error: 'Nombre del alumno obligatorio.' });
        continue;
      }

      try {
        const alRes = await client.query(
          `INSERT INTO alumnos (id_escuela, nombre, apellidos, curp, fecha_nacimiento, estado)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id_alumno`,
          [id_escuela, nombre, apellidos, curp || null, fecha_nacimiento || null, estado]
        );
        const id_alumno = alRes.rows[0].id_alumno;
        creados.alumnos++;

        // Si se indicó grupo, vincular en grupo_alumno
        if (grupoRef && gruposMap.has(grupoRef)) {
          const targetGrupoId = gruposMap.get(grupoRef);
          await client.query(
            `INSERT INTO grupo_alumno (id_grupo, id_alumno, fecha_inscripcion, estado)
             VALUES ($1, $2, CURRENT_DATE, 'Activo')
             ON CONFLICT DO NOTHING`,
            [targetGrupoId, id_alumno]
          );
        }
      } catch (aErr) {
        errores.push({ seccion: 'Alumnos', fila, error: aErr.message });
      }
    }

    // 8. ASIGNACIONES CURRICULARES (Grupo + Materia + Docente)
    for (let i = 0; i < relaciones.length; i++) {
      const r = relaciones[i];
      const fila = r._rowNumber || i + 2;

      const gRef = (r.grupo || r.nombre_grupo || '').trim().toLowerCase();
      const mRef = (r.materia || r.nombre_materia || '').trim().toLowerCase();
      const dRef = (r.docente || r.nombre_docente || r.correo_docente || r.curp_docente || '').trim().toLowerCase();

      const id_grupo = gruposMap.get(gRef);
      const id_materia = materiasMap.get(mRef);
      const id_docente = docentesMap.get(dRef) || docentesMap.get(r.docente?.trim().toUpperCase());

      if (!id_grupo || !id_materia || !id_docente) {
        errores.push({
          seccion: 'Asignaciones',
          fila,
          error: `No se pudo relacionar grupo "${r.grupo}", materia "${r.materia}" y docente "${r.docente}". Verifique que los nombres coincidan exactamente.`,
        });
        continue;
      }

      try {
        const checkExist = await client.query(
          `SELECT id_grupo_docente FROM grupo_docente WHERE id_grupo = $1 AND id_materia = $2`,
          [id_grupo, id_materia]
        );

        if (checkExist.rows.length > 0) {
          await client.query(
            `UPDATE grupo_docente SET id_docente = $1 WHERE id_grupo = $2 AND id_materia = $3`,
            [id_docente, id_grupo, id_materia]
          );
        } else {
          await client.query(
            `INSERT INTO grupo_docente (id_grupo, id_docente, id_materia)
             VALUES ($1, $2, $3)`,
            [id_grupo, id_docente, id_materia]
          );
        }
        creados.relaciones++;
      } catch (relErr) {
        errores.push({ seccion: 'Asignaciones', fila, error: relErr.message });
      }
    }

    await client.query('COMMIT');

    // Despachar correos en background sin bloquear
    (async () => {
      for (const em of emailsAEnviar) {
        try {
          await enviarCorreoAltaDocente({
            destinatario: em.correo,
            nombreDocente: em.nombreCompleto,
            escuelaNombre: nombreEscuela,
            curp: em.curp,
          });
        } catch (e) {
          console.warn('Error enviando correo a docente importado:', em.correo, e.message);
        }
      }
    })();

    return res.json({
      success: true,
      message: `Importación integral procesada con éxito: ${creados.grupos} grupos, ${creados.materias} materias, ${creados.docentes} docentes, ${creados.alumnos} alumnos y ${creados.relaciones} asignaciones curriculares.`,
      creados,
      errores,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en POST /api/directivo/importar-integral:', err);
    return res.status(500).json({ success: false, message: 'Error al procesar la importación integral.', error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 12. CONSULTA DE DEPENDENCIAS Y ELIMINACIÓN LÓGICA (SOFT-DELETE)
// ==========================================

/**
 * GET /api/directivo/dependencias/:tipo/:id
 * Evalúa las relaciones activas de un alumno, docente, grupo o materia
 * antes de que el directivo lo elimine del sistema, para mostrar advertencias detalladas.
 */
router.get('/dependencias/:tipo/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { tipo, id } = req.params;

    if (tipo === 'alumno') {
      const aRes = await db.query(
        `SELECT a.id_alumno, a.nombre, a.apellidos, g.nombre_grupo, g.grado
         FROM alumnos a
         LEFT JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
         LEFT JOIN grupo g ON ga.id_grupo = g.id_grupo
         WHERE a.id_alumno = $1 AND a.id_escuela = $2`,
        [id, id_escuela]
      );
      if (aRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
      }

      const alumno = aRes.rows[0];
      const califs = await db.query(`SELECT COUNT(*)::int AS count FROM calificacion WHERE id_alumno = $1`, [id]);
      const asists = await db.query(`SELECT COUNT(*)::int AS count FROM asistencia WHERE id_alumno = $1`, [id]);
      const alertas = await db.query(`SELECT COUNT(*)::int AS count FROM alerta WHERE id_alumno = $1`, [id]);

      const relaciones = [];
      if (alumno.nombre_grupo) {
        relaciones.push(`Inscrito activamente en el grupo: ${alumno.nombre_grupo} (${alumno.grado}°)`);
      }
      if (califs.rows[0].count > 0) {
        relaciones.push(`Historial académico de ${califs.rows[0].count} calificaciones registradas`);
      }
      if (asists.rows[0].count > 0) {
        relaciones.push(`Registro de ${asists.rows[0].count} asistencias escolares`);
      }
      if (alertas.rows[0].count > 0) {
        relaciones.push(`${alertas.rows[0].count} alertas de seguimiento emitidas`);
      }

      return res.json({
        success: true,
        tipo: 'alumno',
        nombre: `${alumno.nombre} ${alumno.apellidos || ''}`.trim(),
        tieneRelaciones: relaciones.length > 0,
        relaciones,
        advertencia: relaciones.length > 0
          ? 'El alumno se dará de baja de su grupo y se ocultará de las listas activas del sistema. Toda su información y calificaciones históricas permanecerán protegidas en el respaldo de la base de datos.'
          : 'El alumno será dado de baja del sistema sin registros académicos previos.',
      });
    }

    if (tipo === 'docente') {
      const dRes = await db.query(
        `SELECT d.id_docente, u.nombre, u.apellidos, u.correo, d.especialidad
         FROM docentes d
         JOIN usuario u ON d.id_usuario = u.id_usuario
         WHERE d.id_docente = $1 AND d.id_escuela = $2`,
        [id, id_escuela]
      );
      if (dRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Docente no encontrado.' });
      }

      const docente = dRes.rows[0];
      const asigRes = await db.query(
        `SELECT g.nombre_grupo, g.grado, m.nombre_materia
         FROM grupo_docente gd
         JOIN grupo g ON gd.id_grupo = g.id_grupo
         JOIN materia m ON gd.id_materia = m.id_materia
         WHERE gd.id_docente = $1`,
        [id]
      );

      const relaciones = asigRes.rows.map(
        (asg) => `Materia "${asg.nombre_materia}" impartida en el grupo ${asg.nombre_grupo} (${asg.grado}°)`
      );

      return res.json({
        success: true,
        tipo: 'docente',
        nombre: `${docente.nombre} ${docente.apellidos || ''}`.trim(),
        tieneRelaciones: relaciones.length > 0,
        relaciones,
        advertencia: relaciones.length > 0
          ? `El docente tiene ${relaciones.length} asignaciones curriculares activas. Al darlo de baja del sistema, se desvincularán de los horarios y listas activas, pero el historial de evaluaciones impartidas quedará resguardado en la base de datos.`
          : 'El docente será dado de baja del sistema institucional.',
      });
    }

    if (tipo === 'grupo') {
      const gRes = await db.query(
        `SELECT id_grupo, nombre_grupo, grado, ciclo_escolar
         FROM grupo
         WHERE id_grupo = $1 AND id_escuela = $2`,
        [id, id_escuela]
      );
      if (gRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
      }

      const grupo = gRes.rows[0];
      const alumCount = await db.query(
        `SELECT COUNT(*)::int AS count FROM grupo_alumno WHERE id_grupo = $1 AND (estado = 'Activo' OR estado IS NULL)`,
        [id]
      );
      const asigRes = await db.query(
        `SELECT m.nombre_materia, u.nombre, u.apellidos
         FROM grupo_docente gd
         JOIN materia m ON gd.id_materia = m.id_materia
         JOIN docentes d ON gd.id_docente = d.id_docente
         JOIN usuario u ON d.id_usuario = u.id_usuario
         WHERE gd.id_grupo = $1`,
        [id]
      );

      const relaciones = [];
      if (alumCount.rows[0].count > 0) {
        relaciones.push(`${alumCount.rows[0].count} alumnos inscritos actualmente en este grupo`);
      }
      asigRes.rows.forEach((a) => {
        relaciones.push(`Materia "${a.nombre_materia}" impartida por ${a.nombre} ${a.apellidos || ''}`);
      });

      return res.json({
        success: true,
        tipo: 'grupo',
        nombre: grupo.nombre_grupo,
        tieneRelaciones: relaciones.length > 0,
        relaciones,
        advertencia: relaciones.length > 0
          ? 'Al eliminar este grupo del sistema, los alumnos inscritos quedarán desvinculados para que puedan asignarse a otro grupo, y las cargas docentes activas se liberarán. El histórico de calificaciones y asistencias continuará respaldado en la base de datos.'
          : 'El grupo será eliminado del catálogo activo escolar.',
      });
    }

    if (tipo === 'materia') {
      const mRes = await db.query(
        `SELECT id_materia, nombre_materia, descripcion
         FROM materia
         WHERE id_materia = $1 AND (id_escuela = $2 OR id_escuela IS NULL)`,
        [id, id_escuela]
      );
      if (mRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Materia no encontrada.' });
      }

      const materia = mRes.rows[0];
      const asigRes = await db.query(
        `SELECT g.nombre_grupo, g.grado, u.nombre, u.apellidos
         FROM grupo_docente gd
         JOIN grupo g ON gd.id_grupo = g.id_grupo
         JOIN docentes d ON gd.id_docente = d.id_docente
         JOIN usuario u ON d.id_usuario = u.id_usuario
         WHERE gd.id_materia = $1 AND g.id_escuela = $2`,
        [id, id_escuela]
      );

      const relaciones = asigRes.rows.map(
        (a) => `Asignada en grupo ${a.nombre_grupo} (${a.grado}°) a cargo de ${a.nombre} ${a.apellidos || ''}`
      );

      return res.json({
        success: true,
        tipo: 'materia',
        nombre: materia.nombre_materia,
        tieneRelaciones: relaciones.length > 0,
        relaciones,
        advertencia: relaciones.length > 0
          ? `Esta materia está asignada en ${relaciones.length} grupos. Al eliminarla del catálogo activo del sistema se retirará de las asignaciones curriculares, resguardando las calificaciones emitidas en la base de datos.`
          : 'La materia se retirará del catálogo activo de la escuela.',
      });
    }

    return res.status(400).json({ success: false, message: 'Tipo de entidad no reconocido.' });
  } catch (err) {
    console.error('Error en GET /api/directivo/dependencias:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar dependencias del registro.' });
  }
});

/**
 * DELETE /api/directivo/alumnos/:id
 * Eliminación lógica (soft-delete): el alumno pasa a estado 'Inactivo' y se desvincula de grupo.
 * NO se borra de la BD para conservar el respaldo histórico.
 */
router.delete('/alumnos/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const check = await db.query(
      `SELECT nombre, apellidos FROM alumnos WHERE id_alumno = $1 AND id_escuela = $2`,
      [id, id_escuela]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }

    const { nombre, apellidos } = check.rows[0];

    // Marcar alumno como Inactivo en alumnos
    await db.query(
      `UPDATE alumnos SET estado = 'Inactivo' WHERE id_alumno = $1 AND id_escuela = $2`,
      [id, id_escuela]
    );

    // Desvincular de grupo en grupo_alumno
    await db.query(
      `UPDATE grupo_alumno SET estado = 'Inactivo' WHERE id_alumno = $1`,
      [id]
    );

    return res.json({
      success: true,
      message: `El alumno "${nombre} ${apellidos || ''}" ha sido eliminado del sistema. Sus datos y calificaciones permanecen protegidos en el respaldo de la base de datos.`,
    });
  } catch (err) {
    console.error('Error en DELETE /api/directivo/alumnos/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar alumno del sistema.' });
  }
});

/**
 * DELETE /api/directivo/docentes/:id
 * Eliminación lógica (soft-delete): el docente y su usuario pasan a 'Inactivo', y se retiran sus asignaciones activas.
 * NO se borra de la BD para conservar el respaldo histórico.
 */
router.delete('/docentes/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const check = await db.query(
      `SELECT d.id_docente, d.id_usuario, u.nombre, u.apellidos
       FROM docentes d
       JOIN usuario u ON d.id_usuario = u.id_usuario
       WHERE d.id_docente = $1 AND d.id_escuela = $2`,
      [id, id_escuela]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Docente no encontrado.' });
    }

    const { id_usuario, nombre, apellidos } = check.rows[0];

    // Marcar como inactivo en docentes y en usuario
    await db.query(`UPDATE docentes SET estado = 'Inactivo' WHERE id_docente = $1`, [id]);
    await db.query(`UPDATE usuario SET estado = 'Inactivo' WHERE id_usuario = $1`, [id_usuario]);

    // Retirar de grupo_docente para liberar materias y grupos en el panel
    await db.query(`DELETE FROM grupo_docente WHERE id_docente = $1`, [id]);

    return res.json({
      success: true,
      message: `El docente "${nombre} ${apellidos || ''}" ha sido dado de baja del sistema. Sus antecedentes docentes permanecen respaldados en la base de datos.`,
    });
  } catch (err) {
    console.error('Error en DELETE /api/directivo/docentes/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar docente del sistema.' });
  }
});

/**
 * DELETE /api/directivo/grupos/:id
 * Eliminación lógica (soft-delete): el grupo pasa a 'Inactivo', sus alumnos inscritos pasan a estado Inactivo en grupo_alumno
 * y se eliminan las asignaciones en grupo_docente.
 * NO se borra de la BD para conservar el respaldo histórico.
 */
router.delete('/grupos/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const check = await db.query(
      `SELECT nombre_grupo, grado FROM grupo WHERE id_grupo = $1 AND id_escuela = $2`,
      [id, id_escuela]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    const { nombre_grupo } = check.rows[0];

    // Marcar grupo como inactivo
    await db.query(`UPDATE grupo SET estado = 'Inactivo' WHERE id_grupo = $1 AND id_escuela = $2`, [id, id_escuela]);

    // Desvincular alumnos en grupo_alumno
    await db.query(`UPDATE grupo_alumno SET estado = 'Inactivo' WHERE id_grupo = $1`, [id]);

    // Liberar asignaciones de materias y docentes
    await db.query(`DELETE FROM grupo_docente WHERE id_grupo = $1`, [id]);

    return res.json({
      success: true,
      message: `El grupo "${nombre_grupo}" ha sido eliminado del sistema. Los historiales escolares continúan resguardados en la base de datos.`,
    });
  } catch (err) {
    console.error('Error en DELETE /api/directivo/grupos/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar grupo del sistema.' });
  }
});

/**
 * DELETE /api/directivo/materias/:id
 * Eliminación lógica (soft-delete): la materia pasa a 'Inactivo' y se desvincula de las cargas docentes.
 * NO se borra de la BD para conservar el respaldo histórico.
 */
router.delete('/materias/:id', async (req, res) => {
  try {
    const id_escuela = req.user.id_escuela;
    const { id } = req.params;

    const check = await db.query(
      `SELECT nombre_materia FROM materia WHERE id_materia = $1 AND (id_escuela = $2 OR id_escuela IS NULL)`,
      [id, id_escuela]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada.' });
    }

    const { nombre_materia } = check.rows[0];

    // Marcar materia como inactiva
    await db.query(
      `UPDATE materia SET estado = 'Inactivo' WHERE id_materia = $1 AND (id_escuela = $2 OR id_escuela IS NULL)`,
      [id, id_escuela]
    );

    // Desvincular de grupo_docente
    await db.query(`DELETE FROM grupo_docente WHERE id_materia = $1`, [id]);

    return res.json({
      success: true,
      message: `La materia "${nombre_materia}" ha sido eliminada del catálogo activo del sistema. Todas las calificaciones históricas permanecen respaldadas en la base de datos.`,
    });
  } catch (err) {
    console.error('Error en DELETE /api/directivo/materias/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar materia del sistema.' });
  }
});

module.exports = router;


