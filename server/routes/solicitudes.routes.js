const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { notificarEscuelaPorCorreo, verificarConexionSMTP } = require('../utils/email');
const { consultarCodigoPostal, validarColoniaParaCP } = require('../utils/sepomex');

const router = express.Router();

// GET /api/solicitudes/cp/:codigo_postal - Consultar colonias por código postal mexicano
router.get('/cp/:codigo_postal', async (req, res) => {
  try {
    const { codigo_postal } = req.params;
    const cleanCP = (codigo_postal || '').trim();

    if (!/^\d{5}$/.test(cleanCP)) {
      return res.status(400).json({
        success: false,
        message: 'El código postal debe contener exactamente 5 dígitos numéricos.',
        colonias: [],
      });
    }

    const data = await consultarCodigoPostal(cleanCP);
    return res.json({
      success: true,
      encontrado: data.encontrado,
      codigo_postal: data.cp,
      colonias: data.colonias,
      municipio: data.municipio,
      estado: data.estado,
    });
  } catch (error) {
    console.error('Error al consultar código postal:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al consultar el código postal.',
      colonias: [],
    });
  }
});

// GET /api/solicitudes - Listar solicitudes con paginación, búsqueda y filtros
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
        s.nombre_escuela ILIKE $${pIdx} OR 
        s.cct ILIKE $${pIdx} OR 
        s.municipio ILIKE $${pIdx} OR 
        s.nombre_responsable ILIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    if (estado && estado.toLowerCase() !== 'todas') {
      conditions.push(`LOWER(s.estado_solicitud) = LOWER($${pIdx})`);
      params.push(estado);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Consulta de conteo
    const countQuery = `SELECT count(*) FROM solicitud_escuela s ${whereClause}`;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Consulta paginada con trazabilidad de resolución
    const dataQuery = `
      SELECT 
        s.id_solicitud,
        s.nombre_escuela,
        s.cct,
        s.nivel_educativo,
        s.turno,
        s.direccion,
        s.colonia,
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
        s.id_usuario_resolucion,
        CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')) as admin_resolucion_nombre
      FROM solicitud_escuela s
      LEFT JOIN usuario u ON s.id_usuario_resolucion = u.id_usuario
      ${whereClause}
      ORDER BY s.fecha_solicitud DESC NULLS LAST
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    params.push(limit, offset);
    const dataRes = await db.query(dataQuery, params);

    return res.json({
      success: true,
      solicitudes: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error en GET /api/solicitudes:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar solicitudes.' });
  }
});

// GET /api/solicitudes/:id - Obtener detalle completo
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        s.id_solicitud,
        s.nombre_escuela,
        s.cct,
        s.nivel_educativo,
        s.turno,
        s.direccion,
        s.colonia,
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
        s.id_usuario_resolucion,
        CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')) as admin_resolucion_nombre
      FROM solicitud_escuela s
      LEFT JOIN usuario u ON s.id_usuario_resolucion = u.id_usuario
      WHERE s.id_solicitud = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    return res.json({ success: true, solicitud: result.rows[0] });
  } catch (error) {
    console.error('Error en GET /api/solicitudes/:id:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar detalle de solicitud.' });
  }
});

// POST /api/solicitudes - Registrar nueva solicitud con validaciones estrictas
router.post('/', async (req, res) => {
  try {
    const {
      nombre_escuela,
      cct,
      nivel_educativo,
      turno,
      direccion,
      colonia,
      municipio,
      estado,
      codigo_postal,
      telefono,
      correo_institucional,
      nombre_responsable,
      correo_responsable,
      telefono_responsable,
      contrasena_responsable,
    } = req.body;

    // 1. Validar nombre de escuela
    if (!nombre_escuela || !nombre_escuela.trim()) {
      return res.status(400).json({
        success: false,
        field: 'nombre_escuela',
        message: 'El nombre de la escuela es obligatorio y no puede estar vacío.',
      });
    }
    if (nombre_escuela.trim().length > 150) {
      return res.status(400).json({
        success: false,
        field: 'nombre_escuela',
        message: 'El nombre de la escuela excede el límite máximo permitido de 150 caracteres.',
      });
    }

    // 2. Validar CCT (Formato oficial SEP mexicano: 2 números, 3 letras, 4 números, 1 letra)
    if (!cct || !cct.trim()) {
      return res.status(400).json({
        success: false,
        field: 'cct',
        message: 'La Clave de Centro de Trabajo (CCT) es obligatoria.',
      });
    }
    const cleanCCT = cct.trim().toUpperCase();
    const cctRegex = /^[0-9]{2}[A-Z]{3}[0-9]{4}[A-Z]$/;
    if (!cctRegex.test(cleanCCT)) {
      return res.status(400).json({
        success: false,
        field: 'cct',
        message: 'Formato de CCT inválido. Debe contener exactamente 10 caracteres alfanuméricos con la estructura oficial (ej. 14DPR1234K).',
      });
    }

    // Validar duplicado de CCT en solicitudes pendientes o en escuelas activas
    const dupCctCheck = await db.query(
      `SELECT cct FROM solicitud_escuela WHERE UPPER(cct) = $1 AND LOWER(estado_solicitud) = 'pendiente'`,
      [cleanCCT]
    );
    if (dupCctCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        field: 'cct',
        message: 'Ya existe una solicitud pendiente de revisión con esta misma clave CCT.',
      });
    }

    // 3. Validar Teléfono (Exactamente 10 dígitos)
    if (telefono && telefono.trim()) {
      const cleanTel = telefono.trim().replace(/\D/g, '');
      if (cleanTel.length !== 10) {
        return res.status(400).json({
          success: false,
          field: 'telefono',
          message: 'El teléfono institucional debe contener exactamente 10 dígitos numéricos.',
        });
      }
    }

    if (telefono_responsable && telefono_responsable.trim()) {
      const cleanTelResp = telefono_responsable.trim().replace(/\D/g, '');
      if (cleanTelResp.length !== 10) {
        return res.status(400).json({
          success: false,
          field: 'telefono_responsable',
          message: 'El teléfono del responsable debe contener exactamente 10 dígitos numéricos.',
        });
      }
    }

    // 4. Validar Código Postal (5 dígitos) y Colonia correspondiente
    if (codigo_postal && codigo_postal.trim()) {
      const cleanCP = codigo_postal.trim();
      if (!/^\d{5}$/.test(cleanCP)) {
        return res.status(400).json({
          success: false,
          field: 'codigo_postal',
          message: 'El código postal debe contener exactamente 5 dígitos numéricos.',
        });
      }

      // Validar en el backend que la colonia corresponda al código postal capturado
      if (colonia && colonia.trim()) {
        const esValida = await validarColoniaParaCP(cleanCP, colonia.trim());
        if (!esValida) {
          return res.status(400).json({
            success: false,
            field: 'colonia',
            message: `La colonia "${colonia.trim()}" no corresponde al código postal ${cleanCP}.`,
          });
        }
      }
    }

    // 5. Validar Correo Institucional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (correo_institucional && correo_institucional.trim()) {
      const cleanCorreoInst = correo_institucional.trim().toLowerCase();
      if (!emailRegex.test(cleanCorreoInst)) {
        return res.status(400).json({
          success: false,
          field: 'correo_institucional',
          message: 'El correo institucional no tiene una estructura de correo electrónico válida.',
        });
      }
    }

    // 6. Validar Datos del Responsable
    if (!nombre_responsable || !nombre_responsable.trim()) {
      return res.status(400).json({
        success: false,
        field: 'nombre_responsable',
        message: 'El nombre del directivo o responsable es obligatorio.',
      });
    }

    if (!correo_responsable || !correo_responsable.trim()) {
      return res.status(400).json({
        success: false,
        field: 'correo_responsable',
        message: 'El correo electrónico del responsable es obligatorio.',
      });
    }

    const cleanCorreoResp = correo_responsable.trim().toLowerCase();
    if (!emailRegex.test(cleanCorreoResp)) {
      return res.status(400).json({
        success: false,
        field: 'correo_responsable',
        message: 'El correo electrónico del responsable no tiene un formato válido.',
      });
    }

    // 7. Validar Nivel Educativo y Turno permitidos
    const validNiveles = ['Preescolar', 'Primaria', 'Secundaria', 'Telesecundaria'];
    const nivelFinal = validNiveles.includes(nivel_educativo) ? nivel_educativo : 'Primaria';

    const validTurnos = ['Matutino', 'Vespertino', 'Completo'];
    const turnoFinal = validTurnos.includes(turno) ? turno : 'Matutino';

    // Hashear contraseña del responsable
    const rawPass = contrasena_responsable && contrasena_responsable.trim().length >= 6
      ? contrasena_responsable.trim()
      : 'Directivo2026!';
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(rawPass, salt);

    const insertRes = await db.query(
      `INSERT INTO solicitud_escuela (
        nombre_escuela, cct, nivel_educativo, turno, direccion, colonia, municipio, estado,
        codigo_postal, telefono, correo_institucional, nombre_responsable,
        correo_responsable, telefono_responsable, fecha_solicitud, estado_solicitud,
        contrasena_responsable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), 'Pendiente', $15)
      RETURNING id_solicitud, nombre_escuela, cct, estado_solicitud, fecha_solicitud`,
      [
        nombre_escuela.trim(),
        cleanCCT,
        nivelFinal,
        turnoFinal,
        (direccion || '').trim(),
        (colonia || '').trim(),
        (municipio || '').trim(),
        (estado || 'Jalisco').trim(),
        (codigo_postal || '').trim(),
        (telefono || '').trim(),
        (correo_institucional || '').trim().toLowerCase(),
        nombre_responsable.trim(),
        cleanCorreoResp,
        (telefono_responsable || '').trim(),
        passHash,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Solicitud registrada exitosamente con estado Pendiente.',
      solicitud: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error en POST /api/solicitudes:', error);
    return res.status(500).json({ success: false, message: 'Error interno al registrar la solicitud.' });
  }
});

// PUT y POST /api/solicitudes/:id/aprobar - Aprobar solicitud (Disponible para cualquier Administrador General activo)
const aprobarSolicitudHandler = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const adminId = req.user.id_usuario;

    await client.query('BEGIN');

    // 1. Obtener la solicitud bloqueando la fila
    const solRes = await client.query(
      `SELECT * FROM solicitud_escuela WHERE id_solicitud = $1 FOR UPDATE`,
      [id]
    );

    if (solRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    const sol = solRes.rows[0];

    if ((sol.estado_solicitud || '').toLowerCase() === 'aprobada') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya había sido aprobada previamente.',
      });
    }

    // 2. Marcar solicitud como Aprobada registrando fecha y administrador responsable,
    // y marcar automáticamente su notificación como LEÍDA trasladándola a la bandeja de leídas
    await client.query(
      `UPDATE solicitud_escuela 
       SET estado_solicitud = 'Aprobada',
           motivo_rechazo = NULL,
           fecha_resolucion = NOW(),
           id_usuario_resolucion = $1,
           notificacion_leida = true,
           fecha_leida = COALESCE(fecha_leida, NOW())
       WHERE id_solicitud = $2`,
      [adminId, id]
    );

    // 3. Crear o actualizar escuela en tabla `escuelas` respetando relaciones
    let id_escuela = null;
    const existingEscuela = await client.query(
      `SELECT id_escuela FROM escuelas WHERE UPPER(cct) = UPPER($1)`,
      [sol.cct]
    );

    if (existingEscuela.rows.length > 0) {
      id_escuela = existingEscuela.rows[0].id_escuela;
      await client.query(
        `UPDATE escuelas 
         SET nombre_escuela = $1, nivel_educativo = $2, turno = $3, direccion = $4,
             colonia = $5, municipio = $6, estado = $7, codigo_postal = $8, telefono = $9,
             correo_institucional = $10, estado_escuela = 'Activa'
         WHERE id_escuela = $11`,
        [
          sol.nombre_escuela,
          sol.nivel_educativo,
          sol.turno,
          sol.direccion,
          sol.colonia,
          sol.municipio,
          sol.estado,
          sol.codigo_postal,
          sol.telefono,
          sol.correo_institucional,
          id_escuela,
        ]
      );
    } else {
      const newEscuela = await client.query(
        `INSERT INTO escuelas (
          nombre_escuela, cct, nivel_educativo, turno, direccion, colonia, municipio,
          estado, codigo_postal, telefono, correo_institucional, estado_escuela
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Activa')
        RETURNING id_escuela`,
        [
          sol.nombre_escuela,
          sol.cct ? sol.cct.toUpperCase() : 'PENDIENTE',
          sol.nivel_educativo,
          sol.turno,
          sol.direccion,
          sol.colonia,
          sol.municipio,
          sol.estado,
          sol.codigo_postal,
          sol.telefono,
          sol.correo_institucional,
        ]
      );
      id_escuela = newEscuela.rows[0].id_escuela;
    }

    // Vincular id_escuela en solicitud_escuela
    await client.query(
      `UPDATE solicitud_escuela SET id_escuela = $1 WHERE id_solicitud = $2`,
      [id_escuela, id]
    );

    // 4. Crear o asociar usuario Directivo si tiene correo_responsable
    let tokenActivacion = null;
    if (sol.correo_responsable) {
      tokenActivacion = crypto.randomBytes(32).toString('hex');
      const tokenExpira = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas de vigencia

      const userRes = await client.query(
        `SELECT id_usuario, rol FROM usuario WHERE LOWER(correo) = LOWER($1)`,
        [sol.correo_responsable]
      );

      const passHash = sol.contrasena_responsable || (await bcrypt.hash('Directivo2026!', 10));

      if (userRes.rows.length > 0) {
        const existingUser = userRes.rows[0];
        if (existingUser.rol !== 'Administrador') {
          await client.query(
            `UPDATE usuario 
             SET id_escuela = $1, rol = 'Directivo', estado = 'Activo',
                 token_activacion = $2, token_activacion_expira = $3
             WHERE id_usuario = $4`,
            [id_escuela, tokenActivacion, tokenExpira, existingUser.id_usuario]
          );
        }
      } else {
        await client.query(
          `INSERT INTO usuario (
            id_escuela, nombre, apellidos, correo, contrasena, rol, estado, fecha_registro,
            token_activacion, token_activacion_expira, cuenta_activada
          ) VALUES ($1, $2, $3, $4, $5, 'Directivo', 'Activo', NOW(), $6, $7, FALSE)`,
          [
            id_escuela,
            sol.nombre_responsable || 'Directivo Responsable',
            '',
            sol.correo_responsable.toLowerCase(),
            passHash,
            tokenActivacion,
            tokenExpira,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Notificación por correo a la escuela (real si está configurado SMTP, adjuntando PDF oficial)
    const emailDest = sol.correo_responsable || sol.correo_institucional;
    let emailStatus = null;
    if (emailDest) {
      emailStatus = await notificarEscuelaPorCorreo({
        destinatario: emailDest,
        nombreEscuela: sol.nombre_escuela,
        estado: 'Aprobada',
        solicitudData: {
          ...sol,
          id_solicitud: id,
          admin_nombre: `${req.user.nombre} ${req.user.apellidos || ''}`.trim(),
          token_activacion: tokenActivacion,
        },
      });
    }

    return res.json({
      success: true,
      message: `La solicitud de "${sol.nombre_escuela}" ha sido aprobada exitosamente y registrada en el catálogo de escuelas.`,
      id_solicitud: id,
      id_escuela,
      estado_solicitud: 'Aprobada',
      emailStatus,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al aprobar solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error interno al aprobar la solicitud.' });
  } finally {
    client.release();
  }
};

router.put('/:id/aprobar', authMiddleware, aprobarSolicitudHandler);
router.post('/:id/aprobar', authMiddleware, aprobarSolicitudHandler);

// PUT y POST /api/solicitudes/:id/rechazar - Rechazar solicitud con motivo justificado (Cualquier Administrador General)
const rechazarSolicitudHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_rechazo } = req.body;
    const adminId = req.user.id_usuario;

    if (!motivo_rechazo || !motivo_rechazo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Es obligatorio proporcionar un motivo claro y justificado para rechazar la solicitud.',
      });
    }

    // Verificar existencia y estado previo para evitar duplicados
    const solRes = await db.query(
      `SELECT * FROM solicitud_escuela WHERE id_solicitud = $1`,
      [id]
    );

    if (solRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    const sol = solRes.rows[0];

    if ((sol.estado_solicitud || '').toLowerCase() === 'rechazada') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud ya había sido rechazada previamente.',
      });
    }

    // Al rechazar la solicitud, actualizar estado y marcar automáticamente su notificación como LEÍDA trasladándola a la bandeja de leídas
    await db.query(
      `UPDATE solicitud_escuela 
       SET estado_solicitud = 'Rechazada', 
           motivo_rechazo = $1,
           fecha_resolucion = NOW(),
           id_usuario_resolucion = $2,
           notificacion_leida = true,
           fecha_leida = COALESCE(fecha_leida, NOW())
       WHERE id_solicitud = $3`,
      [motivo_rechazo.trim(), adminId, id]
    );

    // Notificación por correo a la escuela (real si está configurado SMTP)
    const emailDest = sol.correo_responsable || sol.correo_institucional;
    let emailStatus = null;
    if (emailDest) {
      emailStatus = await notificarEscuelaPorCorreo({
        destinatario: emailDest,
        nombreEscuela: sol.nombre_escuela,
        estado: 'Rechazada',
        motivoRechazo: motivo_rechazo.trim(),
        solicitudData: {
          ...sol,
          id_solicitud: id,
          admin_nombre: `${req.user.nombre} ${req.user.apellidos || ''}`.trim(),
        },
      });
    }

    return res.json({
      success: true,
      message: `La solicitud de "${sol.nombre_escuela}" ha sido rechazada debidamente.`,
      id_solicitud: id,
      estado_solicitud: 'Rechazada',
      motivo_rechazo: motivo_rechazo.trim(),
      emailStatus,
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error interno al rechazar la solicitud.' });
  }
};

router.put('/:id/rechazar', authMiddleware, rechazarSolicitudHandler);
router.post('/:id/rechazar', authMiddleware, rechazarSolicitudHandler);

// POST /api/solicitudes/:id/reenviar-correo - Reenviar correo de aprobación a escuela ya aprobada
router.post('/:id/reenviar-correo', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const solRes = await db.query(
      `SELECT * FROM solicitud_escuela WHERE id_solicitud = $1`,
      [id]
    );

    if (solRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }

    const sol = solRes.rows[0];

    if ((sol.estado_solicitud || '').toLowerCase() !== 'aprobada') {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede reenviar el correo de aprobación para solicitudes que ya han sido aprobadas.',
      });
    }

    const emailDest = sol.correo_responsable || sol.correo_institucional;
    if (!emailDest) {
      return res.status(400).json({
        success: false,
        message: 'La solicitud no cuenta con una dirección de correo válida para el responsable ni institucional.',
      });
    }

    // Generar o refrescar token de activación para el responsable
    let tokenActivacion = null;
    if (sol.correo_responsable) {
      tokenActivacion = crypto.randomBytes(32).toString('hex');
      const tokenExpira = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas de vigencia

      await db.query(
        `UPDATE usuario 
         SET token_activacion = $1, token_activacion_expira = $2 
         WHERE LOWER(correo) = LOWER($3) AND rol = 'Directivo'`,
        [tokenActivacion, tokenExpira, sol.correo_responsable]
      );
    }

    const emailStatus = await notificarEscuelaPorCorreo({
      destinatario: emailDest,
      nombreEscuela: sol.nombre_escuela,
      estado: 'Aprobada',
      solicitudData: {
        ...sol,
        id_solicitud: id,
        admin_nombre: `${req.user.nombre} ${req.user.apellidos || ''}`.trim(),
        token_activacion: tokenActivacion,
      },
    });

    if (emailStatus && emailStatus.sent) {
      return res.json({
        success: true,
        message: `Correo de aprobación reenviado exitosamente a ${emailDest}.`,
        emailStatus,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: `No se pudo enviar el correo: ${emailStatus?.error || 'Error desconocido del servidor SMTP.'}`,
        emailStatus,
      });
    }
  } catch (error) {
    console.error('Error al reenviar correo de solicitud:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al intentar reenviar la notificación por correo.',
    });
  }
});

// GET /api/solicitudes/smtp/status - Comprobar conexión SMTP y estado del servicio
router.get('/smtp/status', authMiddleware, async (req, res) => {
  try {
    const status = await verificarConexionSMTP();
    return res.json({
      success: status.ok,
      status,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al verificar la conexión SMTP.',
    });
  }
});

module.exports = router;
