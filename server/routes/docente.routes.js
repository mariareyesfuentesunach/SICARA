const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { docenteMiddleware } = require('../middleware/auth');

// Todas las rutas requieren sesión activa con rol Docente y escuela asignada
router.use(docenteMiddleware);

// Helper para obtener el id_docente a partir de req.user.id_usuario
async function getDocenteInfo(id_usuario, id_escuela) {
  const res = await db.query(
    `SELECT d.id_docente, d.curp, d.especialidad, d.telefono, d.estado,
            u.nombre, u.apellidos, u.correo,
            e.nombre_escuela, e.cct, e.color_primario, e.color_secundario, e.color_complementario
     FROM docentes d
     JOIN usuario u ON d.id_usuario = u.id_usuario
     JOIN escuelas e ON d.id_escuela = e.id_escuela
     WHERE d.id_usuario = $1 AND d.id_escuela = $2`,
    [id_usuario, id_escuela]
  );
  return res.rows[0] || null;
}

// ============================================================
// 1. PERFIL Y ASIGNACIONES DEL DOCENTE (Grupos y Materias)
// ============================================================
router.get('/contexto', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) {
      return res.status(404).json({ success: false, message: 'Perfil de docente no encontrado.' });
    }

    // Consultar asignaciones: grupos y materias que imparte
    const asignacionesRes = await db.query(
      `SELECT gd.id_grupo_docente, gd.id_grupo, gd.id_materia,
              g.nombre_grupo, g.grado, g.ciclo_escolar,
              m.nombre_materia, m.descripcion AS materia_desc,
              COUNT(DISTINCT ga.id_alumno)::int AS total_alumnos
       FROM grupo_docente gd
       JOIN grupo g ON gd.id_grupo = g.id_grupo
       JOIN materia m ON gd.id_materia = m.id_materia
       LEFT JOIN grupo_alumno ga ON g.id_grupo = ga.id_grupo AND (ga.estado IS NULL OR ga.estado = 'Activo')
       WHERE gd.id_docente = $1 AND g.id_escuela = $2
       GROUP BY gd.id_grupo_docente, gd.id_grupo, gd.id_materia, g.nombre_grupo, g.grado, g.ciclo_escolar, m.nombre_materia, m.descripcion
       ORDER BY g.grado ASC, g.nombre_grupo ASC, m.nombre_materia ASC`,
      [docente.id_docente, id_escuela]
    );

    // Contar alertas pendientes dirigidas o relacionadas con sus alumnos
    const alertasCountRes = await db.query(
      `SELECT COUNT(DISTINCT al.id_alerta)::int AS total
       FROM alerta al
       JOIN grupo_alumno ga ON al.id_alumno = ga.id_alumno
       JOIN grupo_docente gd ON ga.id_grupo = gd.id_grupo
       WHERE gd.id_docente = $1 AND al.id_escuela = $2 AND al.estado_alerta != 'Resuelta'`,
      [docente.id_docente, id_escuela]
    );

    return res.json({
      success: true,
      docente,
      asignaciones: asignacionesRes.rows,
      alertasPendientes: alertasCountRes.rows[0]?.total || 0,
    });
  } catch (err) {
    console.error('Error en GET /api/docente/contexto:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener contexto del docente.' });
  }
});

// ============================================================
// 2. DASHBOARD Y RESUMEN GENERAL DEL DOCENTE
// ============================================================
router.get('/dashboard', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) {
      return res.status(404).json({ success: false, message: 'Docente no encontrado.' });
    }

    // Alumnos totales únicos a su cargo
    const alumnosTotalRes = await db.query(
      `SELECT COUNT(DISTINCT ga.id_alumno)::int AS total
       FROM grupo_docente gd
       JOIN grupo_alumno ga ON gd.id_grupo = ga.id_grupo AND (ga.estado IS NULL OR ga.estado = 'Activo')
       WHERE gd.id_docente = $1 AND gd.id_escuela = $2`,
      [docente.id_docente, id_escuela]
    ).catch(() => {
      // Fallback si gd.id_escuela no existe directamente
      return db.query(
        `SELECT COUNT(DISTINCT ga.id_alumno)::int AS total
         FROM grupo_docente gd
         JOIN grupo g ON gd.id_grupo = g.id_grupo
         JOIN grupo_alumno ga ON g.id_grupo = ga.id_grupo AND (ga.estado IS NULL OR ga.estado = 'Activo')
         WHERE gd.id_docente = $1 AND g.id_escuela = $2`,
        [docente.id_docente, id_escuela]
      );
    });

    // Grupos asignados
    const gruposTotalRes = await db.query(
      `SELECT COUNT(DISTINCT gd.id_grupo)::int AS total
       FROM grupo_docente gd
       WHERE gd.id_docente = $1`,
      [docente.id_docente]
    );

    // Alertas pendientes
    const alertasRes = await db.query(
      `SELECT al.id_alerta, al.id_alumno, al.tipo_alerta, al.descripcion, al.observaciones,
              al.estado_alerta, al.fecha_generacion,
              a.nombre, a.apellidos, a.curp,
              g.nombre_grupo, g.grado
       FROM alerta al
       JOIN alumnos a ON al.id_alumno = a.id_alumno
       JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno
       JOIN grupo_docente gd ON ga.id_grupo = gd.id_grupo
       JOIN grupo g ON ga.id_grupo = g.id_grupo
       WHERE gd.id_docente = $1 AND al.id_escuela = $2
       ORDER BY al.fecha_generacion DESC
       LIMIT 10`,
      [docente.id_docente, id_escuela]
    );

    return res.json({
      success: true,
      stats: {
        totalAlumnos: alumnosTotalRes.rows[0]?.total || 0,
        totalGrupos: gruposTotalRes.rows[0]?.total || 0,
        alertasRecientes: alertasRes.rows,
      },
    });
  } catch (err) {
    console.error('Error en GET /api/docente/dashboard:', err);
    return res.status(500).json({ success: false, message: 'Error al cargar dashboard del docente.' });
  }
});

// ============================================================
// 3. LISTA DE ASISTENCIA Y ALUMNOS CLASIFICADOS POR RANGOS DE RENDIMIENTO
// Rangos actualizados conforme a la solicitud:
// - Verde (Sobresaliente / Regular Alto): 9.0 a 10.0
// - Amarillo (Regular / Reforzamiento Preventivo): 7.0 a 8.9
// - Rojo (Bajo Rendimiento / Crítico): 0.0 a 6.9
// ============================================================
router.get('/asistencia', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const { id_grupo, id_materia, fecha } = req.query;

    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    // Validar grupo asignado al docente
    let targetGrupo = id_grupo;
    let targetMateria = id_materia;

    if (!targetGrupo) {
      const primerGrupo = await db.query(
        `SELECT id_grupo, id_materia FROM grupo_docente WHERE id_docente = $1 LIMIT 1`,
        [docente.id_docente]
      );
      if (primerGrupo.rows.length === 0) {
        return res.json({
          success: true,
          alumnos: [],
          resumen: { verde: 0, amarillo: 0, rojo: 0, sinCalificar: 0 },
          mensaje: 'El docente no tiene grupos asignados aún.',
        });
      }
      targetGrupo = primerGrupo.rows[0].id_grupo;
      targetMateria = primerGrupo.rows[0].id_materia;
    }

    const fechaAsistencia = fecha || new Date().toISOString().split('T')[0];

    // Obtener los alumnos del grupo con su promedio actual (en la materia o general) y asistencia en la fecha
    const alumnosQuery = `
      SELECT a.id_alumno, a.nombre, a.apellidos, a.curp, a.estado AS estado_alumno,
             g.id_grupo, g.nombre_grupo, g.grado,
             -- Promedio de calificaciones
             COALESCE(
               ROUND(
                 AVG(c.calificacion) FILTER (WHERE ($3::uuid IS NULL OR c.id_materia = $3::uuid)), 2
               ),
               ROUND(AVG(c.calificacion), 2)
             ) AS promedio,
             -- Total faltas injustificadas históricas del alumno
             COUNT(DISTINCT asi_faltas.id_asistencia) FILTER (WHERE asi_faltas.estado_asistencia = 'Falta Injustificada' OR asi_faltas.estado_asistencia = 'Falta') AS faltas_injustificadas,
             -- Registro de asistencia en la fecha seleccionada
             asi_dia.id_asistencia,
             asi_dia.estado_asistencia AS asistencia_hoy,
             asi_dia.observaciones AS obs_asistencia
      FROM alumnos a
      JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
      JOIN grupo g ON ga.id_grupo = g.id_grupo
      LEFT JOIN calificacion c ON a.id_alumno = c.id_alumno
      LEFT JOIN asistencia asi_faltas ON a.id_alumno = asi_faltas.id_alumno AND asi_faltas.id_grupo = g.id_grupo
      LEFT JOIN asistencia asi_dia ON a.id_alumno = asi_dia.id_alumno AND asi_dia.id_grupo = g.id_grupo AND asi_dia.fecha = $4::date
      WHERE g.id_grupo = $1 AND g.id_escuela = $2
      GROUP BY a.id_alumno, a.nombre, a.apellidos, a.curp, a.estado, g.id_grupo, g.nombre_grupo, g.grado,
               asi_dia.id_asistencia, asi_dia.estado_asistencia, asi_dia.observaciones
      ORDER BY a.apellidos ASC NULLS LAST, a.nombre ASC
    `;

    const alumnosRes = await db.query(alumnosQuery, [
      targetGrupo,
      id_escuela,
      targetMateria || null,
      fechaAsistencia,
    ]);

    // Clasificar a cada alumno según las especificaciones del usuario:
    // Verde: 9.0 a 10.0
    // Amarillo: 7.0 a 8.9
    // Rojo: 0.0 a 6.9
    let countVerde = 0;
    let countAmarillo = 0;
    let countRojo = 0;
    let countSin = 0;

    const alumnosClasificados = alumnosRes.rows.map((al) => {
      const promNum = al.promedio !== null ? parseFloat(al.promedio) : null;
      let rango = 'sin_calificar';
      let color = 'gray';
      let etiquetaRango = 'Sin calificaciones';

      if (promNum !== null) {
        if (promNum >= 9.0) {
          rango = 'verde';
          color = 'verde'; // 9 a 10
          etiquetaRango = 'Sobresaliente (9.0 - 10.0)';
          countVerde++;
        } else if (promNum >= 7.0) {
          rango = 'amarillo';
          color = 'amarillo'; // 7 a 8.9
          etiquetaRango = 'Regular (7.0 - 8.9)';
          countAmarillo++;
        } else {
          rango = 'rojo';
          color = 'rojo'; // 0 a 6.9
          etiquetaRango = 'Bajo Rendimiento (0.0 - 6.9)';
          countRojo++;
        }
      } else {
        countSin++;
      }

      return {
        ...al,
        promedio: promNum,
        rango,
        color,
        etiquetaRango,
        asistencia_hoy: al.asistencia_hoy || 'Presente',
      };
    });

    return res.json({
      success: true,
      fecha: fechaAsistencia,
      id_grupo: targetGrupo,
      id_materia: targetMateria,
      alumnos: alumnosClasificados,
      resumen: {
        verde: countVerde,
        amarillo: countAmarillo,
        rojo: countRojo,
        sinCalificar: countSin,
        total: alumnosClasificados.length,
      },
    });
  } catch (err) {
    console.error('Error en GET /api/docente/asistencia:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar lista de asistencia.' });
  }
});

// Guardar pase de lista de asistencia masivo y generar alertas por inasistencias injustificadas
router.post('/asistencia', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const { id_grupo, id_materia, fecha, asistencias } = req.body;

    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    if (!id_grupo || !fecha || !Array.isArray(asistencias)) {
      return res.status(400).json({ success: false, message: 'Datos de asistencia incompletos.' });
    }

    let guardados = 0;
    let alertasGeneradas = 0;

    for (const item of asistencias) {
      const { id_alumno, estado_asistencia, observaciones } = item;
      if (!id_alumno) continue;

      const estadoFinal = estado_asistencia || 'Presente';

      // Insertar o actualizar asistencia
      const exist = await db.query(
        `SELECT id_asistencia FROM asistencia WHERE id_alumno = $1 AND id_grupo = $2 AND fecha = $3`,
        [id_alumno, id_grupo, fecha]
      );

      if (exist.rows.length > 0) {
        await db.query(
          `UPDATE asistencia
           SET estado_asistencia = $1, observaciones = $2, id_docente = $3
           WHERE id_asistencia = $4`,
          [estadoFinal, observaciones || '', docente.id_docente, exist.rows[0].id_asistencia]
        );
      } else {
        await db.query(
          `INSERT INTO asistencia (id_alumno, id_grupo, id_docente, fecha, estado_asistencia, observaciones)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id_alumno, id_grupo, docente.id_docente, fecha, estadoFinal, observaciones || '']
        );
      }
      guardados++;

      // REGLA: Si el alumno tiene inasistencia sin justificación ("Falta Injustificada" o "Falta"),
      // generar automáticamente una alerta en el sistema si no tiene ya una por inasistencia en la misma fecha
      if (estadoFinal === 'Falta Injustificada' || estadoFinal === 'Falta') {
        const checkAlerta = await db.query(
          `SELECT id_alerta FROM alerta
           WHERE id_alumno = $1 AND id_escuela = $2 AND tipo_alerta = 'Inasistencia' AND fecha_generacion = $3`,
          [id_alumno, id_escuela, fecha]
        );

        if (checkAlerta.rows.length === 0) {
          // Obtener nombre del alumno para la descripción
          const alNameRes = await db.query(`SELECT nombre, apellidos FROM alumnos WHERE id_alumno = $1`, [id_alumno]);
          const nom = alNameRes.rows[0] ? `${alNameRes.rows[0].nombre} ${alNameRes.rows[0].apellidos || ''}`.trim() : 'El alumno';

          await db.query(
            `INSERT INTO alerta (id_escuela, id_alumno, tipo_alerta, descripcion, observaciones, estado_alerta, fecha_generacion)
             VALUES ($1, $2, 'Inasistencia', $3, $4, 'Pendiente', $5)`,
            [
              id_escuela,
              id_alumno,
              `Falta injustificada registrada para ${nom} en la fecha ${fecha}.`,
              observaciones ? `Observación docente: ${observaciones}` : 'Inasistencia reportada en el pase de lista.',
              fecha,
            ]
          );
          alertasGeneradas++;
        }
      }
    }

    return res.json({
      success: true,
      message: `Asistencia guardada correctamente (${guardados} alumnos procesados).`,
      alertasGeneradas,
    });
  } catch (err) {
    console.error('Error en POST /api/docente/asistencia:', err);
    return res.status(500).json({ success: false, message: 'Error al registrar lista de asistencia.' });
  }
});

// ============================================================
// 4. MÓDULO DE CALIFICACIONES Y EVALUACIÓN POR RANGOS
// ============================================================
router.get('/calificaciones', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const { id_grupo, id_materia, periodo } = req.query;

    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    if (!id_grupo) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar un grupo escolar.' });
    }

    const periodoEvaluacion = periodo || 'Periodo 1';

    const califQuery = `
      SELECT a.id_alumno, a.nombre, a.apellidos, a.curp,
             c.id_calificacion, c.calificacion, c.periodo, c.observaciones, c.fecha_registro,
             m.nombre_materia
      FROM alumnos a
      JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
      LEFT JOIN calificacion c ON a.id_alumno = c.id_alumno
                               AND c.id_grupo = $1
                               AND ($3::uuid IS NULL OR c.id_materia = $3::uuid)
                               AND c.periodo = $4
      LEFT JOIN materia m ON c.id_materia = m.id_materia
      WHERE ga.id_grupo = $1 AND a.id_escuela = $2
      ORDER BY a.apellidos ASC NULLS LAST, a.nombre ASC
    `;

    const result = await db.query(califQuery, [id_grupo, id_escuela, id_materia || null, periodoEvaluacion]);

    // Clasificar calificaciones con los nuevos rangos solicitados:
    // Verde: 9.0 a 10.0
    // Amarillo: 7.0 a 8.9
    // Rojo: 0.0 a 6.9
    const rows = result.rows.map((row) => {
      const nota = row.calificacion !== null ? parseFloat(row.calificacion) : null;
      let rango = 'sin_evaluar';
      let color = 'gray';
      if (nota !== null) {
        if (nota >= 9.0) {
          rango = 'verde';
          color = 'verde';
        } else if (nota >= 7.0) {
          rango = 'amarillo';
          color = 'amarillo';
        } else {
          rango = 'rojo';
          color = 'rojo';
        }
      }
      return { ...row, calificacion: nota, rango, color };
    });

    return res.json({ success: true, periodo: periodoEvaluacion, alumnos: rows });
  } catch (err) {
    console.error('Error en GET /api/docente/calificaciones:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar calificaciones.' });
  }
});

// Guardar calificaciones y disparar alerta por bajo rendimiento si calif < 6.0
router.post('/calificaciones', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const { id_grupo, id_materia, periodo, calificaciones } = req.body;

    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    if (!id_grupo || !id_materia || !Array.isArray(calificaciones)) {
      return res.status(400).json({ success: false, message: 'Datos incompletos para calificar.' });
    }

    const periodoFinal = periodo || 'Periodo 1';
    let guardados = 0;
    let alertasBajoRendimiento = 0;

    // Obtener nombre de la materia
    const matRes = await db.query(`SELECT nombre_materia FROM materia WHERE id_materia = $1`, [id_materia]);
    const nomMateria = matRes.rows[0]?.nombre_materia || 'la materia';

    for (const item of calificaciones) {
      const { id_alumno, calificacion, observaciones } = item;
      if (!id_alumno || calificacion === null || calificacion === undefined || calificacion === '') continue;

      const notaNum = Math.min(10, Math.max(0, parseFloat(calificacion)));

      // Verificar si ya existe calificación en este grupo, materia y periodo
      const exist = await db.query(
        `SELECT id_calificacion FROM calificacion
         WHERE id_alumno = $1 AND id_grupo = $2 AND id_materia = $3 AND periodo = $4`,
        [id_alumno, id_grupo, id_materia, periodoFinal]
      );

      if (exist.rows.length > 0) {
        await db.query(
          `UPDATE calificacion
           SET calificacion = $1, observaciones = $2, id_docente = $3, fecha_registro = CURRENT_DATE
           WHERE id_calificacion = $4`,
          [notaNum, observaciones || '', docente.id_docente, exist.rows[0].id_calificacion]
        );
      } else {
        await db.query(
          `INSERT INTO calificacion (id_alumno, id_grupo, id_materia, id_docente, periodo, calificacion, observaciones, fecha_registro)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
          [id_alumno, id_grupo, id_materia, docente.id_docente, periodoFinal, notaNum, observaciones || '']
        );
      }
      guardados++;

      // REGLA ACTUALIZADA: Si la calificación está en rango rojo (0.0 a 6.9),
      // generar automáticamente una alerta de Bajo Rendimiento Académico
      if (notaNum <= 6.9) {
        const alRes = await db.query(`SELECT nombre, apellidos FROM alumnos WHERE id_alumno = $1`, [id_alumno]);
        const nomAl = alRes.rows[0] ? `${alRes.rows[0].nombre} ${alRes.rows[0].apellidos || ''}`.trim() : 'El alumno';

        await db.query(
          `INSERT INTO alerta (id_escuela, id_alumno, tipo_alerta, descripcion, observaciones, estado_alerta, fecha_generacion)
           VALUES ($1, $2, 'Bajo Rendimiento', $3, $4, 'Pendiente', CURRENT_DATE)`,
          [
            id_escuela,
            id_alumno,
            `Calificación baja (${notaNum}/10) en ${nomMateria} (${periodoFinal}) para ${nomAl}.`,
            observaciones ? `Observación docente: ${observaciones}` : 'Rango de bajo rendimiento (0.0 a 6.9). Requiere atención pedagógica.',
          ]
        );
        alertasBajoRendimiento++;
      }
    }

    return res.json({
      success: true,
      message: `Calificaciones actualizadas correctamente (${guardados} registros).`,
      alertasBajoRendimiento,
    });
  } catch (err) {
    console.error('Error en POST /api/docente/calificaciones:', err);
    return res.status(500).json({ success: false, message: 'Error al guardar calificaciones.' });
  }
});

// ============================================================
// 4.1 MATRIZ DE CALIFICACIONES POR MATERIAS Y BOLETA DE EVALUACIÓN
// Consulta todas las calificaciones de cada alumno en todas las materias del grupo
// Calcula el promedio general del alumno y entrega el esquema completo para la boleta
// ============================================================
router.get('/boleta-grupo', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const { id_grupo, periodo } = req.query;

    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    if (!id_grupo) {
      return res.status(400).json({ success: false, message: 'Debe especificar el grupo escolar.' });
    }

    const periodoEvaluacion = periodo || 'Periodo 1';

    // 1. Obtener datos del grupo y escuela
    const grpRes = await db.query(
      `SELECT g.id_grupo, g.nombre_grupo, g.grado, g.ciclo_escolar,
              e.nombre_escuela, e.cct, e.color_primario, e.color_secundario, e.color_complementario
       FROM grupo g
       JOIN escuelas e ON g.id_escuela = e.id_escuela
       WHERE g.id_grupo = $1 AND g.id_escuela = $2`,
      [id_grupo, id_escuela]
    );

    if (grpRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    const grupoInfo = grpRes.rows[0];

    // 2. Obtener todas las materias asignadas a este grupo
    const matRes = await db.query(
      `SELECT DISTINCT m.id_materia, m.nombre_materia,
              u.nombre || ' ' || COALESCE(u.apellidos, '') AS docente_titular
       FROM grupo_docente gd
       JOIN materia m ON gd.id_materia = m.id_materia
       JOIN docentes d ON gd.id_docente = d.id_docente
       JOIN usuario u ON d.id_usuario = u.id_usuario
       WHERE gd.id_grupo = $1
       ORDER BY m.nombre_materia ASC`,
      [id_grupo]
    );

    const materiasGrupo = matRes.rows;

    // 3. Obtener alumnos del grupo
    const alRes = await db.query(
      `SELECT a.id_alumno, a.nombre, a.apellidos, a.curp
       FROM alumnos a
       JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
       WHERE ga.id_grupo = $1
       ORDER BY a.apellidos ASC NULLS LAST, a.nombre ASC`,
      [id_grupo]
    );

    const alumnosGrupo = alRes.rows;

    // 4. Obtener todas las calificaciones registradas en este grupo y periodo
    const califRes = await db.query(
      `SELECT c.id_alumno, c.id_materia, c.calificacion, c.observaciones
       FROM calificacion c
       WHERE c.id_grupo = $1 AND c.periodo = $2`,
      [id_grupo, periodoEvaluacion]
    );

    // Mapa de calificaciones: alumnoId -> materiaId -> { calificacion, observaciones }
    const califMap = new Map();
    califRes.rows.forEach((r) => {
      if (!califMap.has(r.id_alumno)) {
        califMap.set(r.id_alumno, new Map());
      }
      califMap.get(r.id_alumno).set(r.id_materia, {
        calificacion: r.calificacion !== null ? parseFloat(r.calificacion) : null,
        observaciones: r.observaciones || '',
      });
    });

    // 5. Estructurar la matriz de calificaciones con cálculo de promedio general por alumno
    const matrizAlumnos = alumnosGrupo.map((al) => {
      const alumnoCalifMap = califMap.get(al.id_alumno) || new Map();
      const notasPorMateria = {};
      let suma = 0;
      let materiasEvaluadas = 0;

      materiasGrupo.forEach((mat) => {
        const item = alumnoCalifMap.get(mat.id_materia);
        const nota = item ? item.calificacion : null;
        notasPorMateria[mat.id_materia] = nota;
        if (nota !== null && !isNaN(nota)) {
          suma += nota;
          materiasEvaluadas++;
        }
      });

      const promedioGeneral = materiasEvaluadas > 0 ? parseFloat((suma / materiasEvaluadas).toFixed(2)) : null;

      // Asignar rango y color según la regla:
      // Verde: 9.0 a 10.0
      // Amarillo: 7.0 a 8.9
      // Rojo: 0.0 a 6.9
      let rangoGeneral = 'sin_evaluar';
      let colorGeneral = 'gray';
      if (promedioGeneral !== null) {
        if (promedioGeneral >= 9.0) {
          rangoGeneral = 'verde';
          colorGeneral = 'verde';
        } else if (promedioGeneral >= 7.0) {
          rangoGeneral = 'amarillo';
          colorGeneral = 'amarillo';
        } else {
          rangoGeneral = 'rojo';
          colorGeneral = 'rojo';
        }
      }

      return {
        id_alumno: al.id_alumno,
        nombre: al.nombre,
        apellidos: al.apellidos,
        curp: al.curp,
        notasPorMateria,
        materiasEvaluadas,
        promedioGeneral,
        rangoGeneral,
        colorGeneral,
      };
    });

    return res.json({
      success: true,
      periodo: periodoEvaluacion,
      grupo: grupoInfo,
      docente: {
        nombre: `${docente.nombre} ${docente.apellidos || ''}`.trim(),
        especialidad: docente.especialidad,
      },
      materias: materiasGrupo,
      alumnos: matrizAlumnos,
      fechaEmision: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error en GET /api/docente/boleta-grupo:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar boletas de calificaciones.' });
  }
});

// ============================================================
// 5. ALERTAS DEL DOCENTE (Inasistencias y Bajo Rendimiento)
// ============================================================
router.get('/alertas', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const { tipo, estado, id_grupo } = req.query;

    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    let query = `
      SELECT al.id_alerta, al.id_alumno, al.id_escuela, al.tipo_alerta, al.descripcion,
             al.observaciones, al.estado_alerta, al.fecha_generacion,
             a.nombre, a.apellidos, a.curp,
             g.id_grupo, g.nombre_grupo, g.grado
      FROM alerta al
      JOIN alumnos a ON al.id_alumno = a.id_alumno
      JOIN grupo_alumno ga ON a.id_alumno = ga.id_alumno AND (ga.estado IS NULL OR ga.estado = 'Activo')
      JOIN grupo_docente gd ON ga.id_grupo = gd.id_grupo
      JOIN grupo g ON ga.id_grupo = g.id_grupo
      WHERE gd.id_docente = $1 AND al.id_escuela = $2
    `;
    const params = [docente.id_docente, id_escuela];

    if (tipo && tipo !== 'todos') {
      params.push(tipo);
      query += ` AND al.tipo_alerta = $${params.length}`;
    }

    if (estado && estado !== 'todos') {
      params.push(estado);
      query += ` AND al.estado_alerta = $${params.length}`;
    }

    if (id_grupo) {
      params.push(id_grupo);
      query += ` AND g.id_grupo = $${params.length}`;
    }

    query += ` GROUP BY al.id_alerta, a.id_alumno, g.id_grupo ORDER BY al.fecha_generacion DESC`;

    const result = await db.query(query, params);
    return res.json({ success: true, alertas: result.rows });
  } catch (err) {
    console.error('Error en GET /api/docente/alertas:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar alertas.' });
  }
});

// Marcar alerta como atendida / resuelta
router.put('/alertas/:id/resolver', async (req, res) => {
  try {
    const { id_escuela } = req.user;
    const { id } = req.params;
    const { observaciones, estado_alerta } = req.body;

    const result = await db.query(
      `UPDATE alerta
       SET estado_alerta = $1, observaciones = COALESCE($2, observaciones)
       WHERE id_alerta = $3 AND id_escuela = $4
       RETURNING *`,
      [estado_alerta || 'Resuelta', observaciones || 'Atendida por el docente responsable.', id, id_escuela]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alerta no encontrada.' });
    }

    return res.json({ success: true, message: 'Alerta actualizada correctamente.', alerta: result.rows[0] });
  } catch (err) {
    console.error('Error en resolver alerta:', err);
    return res.status(500).json({ success: false, message: 'Error al resolver la alerta.' });
  }
});

// ============================================================
// 6. GENERACIÓN Y GESTIÓN DE REPORTES DE BAJO RENDIMIENTO
// ============================================================
router.get('/reportes', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    const result = await db.query(
      `SELECT r.id_reporte, r.tipo_reporte, r.descripcion, r.periodo, r.fecha_generacion,
              r.archivo_nombre, r.datos_json,
              u.nombre AS creador_nombre
       FROM reporte r
       JOIN usuario u ON r.id_usuario = u.id_usuario
       WHERE r.id_escuela = $1 AND r.id_usuario = $2
       ORDER BY r.fecha_generacion DESC`,
      [id_escuela, id_usuario]
    );

    return res.json({ success: true, reportes: result.rows });
  } catch (err) {
    console.error('Error en GET /api/docente/reportes:', err);
    return res.status(500).json({ success: false, message: 'Error al listar reportes.' });
  }
});

// Crear nuevo reporte pedagógico / bajo rendimiento
router.post('/reportes', async (req, res) => {
  try {
    const { id_usuario, id_escuela } = req.user;
    const { id_grupo, id_alumno, tipo_reporte, periodo, descripcion, medidas_pedagogicas, recomendaciones } = req.body;

    const docente = await getDocenteInfo(id_usuario, id_escuela);
    if (!docente) return res.status(404).json({ success: false, message: 'Docente no encontrado.' });

    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ success: false, message: 'La descripción del reporte es obligatoria.' });
    }

    // Datos del alumno si se especificó
    let alumnoInfo = null;
    if (id_alumno) {
      const aRes = await db.query(`SELECT nombre, apellidos, curp FROM alumnos WHERE id_alumno = $1`, [id_alumno]);
      alumnoInfo = aRes.rows[0] || null;
    }

    // Datos del grupo
    let grupoInfo = null;
    if (id_grupo) {
      const gRes = await db.query(`SELECT nombre_grupo, grado FROM grupo WHERE id_grupo = $1`, [id_grupo]);
      grupoInfo = gRes.rows[0] || null;
    }

    const jsonContenido = {
      id_alumno,
      alumno: alumnoInfo ? `${alumnoInfo.nombre} ${alumnoInfo.apellidos || ''}`.trim() : 'General',
      curp: alumnoInfo?.curp || '',
      id_grupo,
      grupo: grupoInfo ? `${grupoInfo.nombre_grupo} (${grupoInfo.grado}°)` : 'No especificado',
      docente: `${docente.nombre} ${docente.apellidos || ''}`.trim(),
      medidas_pedagogicas: medidas_pedagogicas || '',
      recomendaciones: recomendaciones || '',
      fecha: new Date().toISOString(),
    };

    const result = await db.query(
      `INSERT INTO reporte (id_escuela, id_usuario, tipo_reporte, periodo, descripcion, archivo_nombre, datos_json, fecha_generacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
       RETURNING *`,
      [
        id_escuela,
        id_usuario,
        tipo_reporte || 'Bajo Rendimiento Académico',
        periodo || 'Periodo Actual',
        descripcion.trim(),
        `reporte_${Date.now()}.json`,
        JSON.stringify(jsonContenido),
      ]
    );

    return res.json({
      success: true,
      message: 'Reporte académico registrado exitosamente.',
      reporte: result.rows[0],
    });
  } catch (err) {
    console.error('Error en POST /api/docente/reportes:', err);
    return res.status(500).json({ success: false, message: 'Error al guardar el reporte.' });
  }
});

module.exports = router;

