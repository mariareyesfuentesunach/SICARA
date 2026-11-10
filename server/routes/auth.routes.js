const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { notificarEscuelaPorCorreo, enviarCorreoRecuperacion } = require('../utils/email');

const router = express.Router();

// Helper middleware para getMe y logout que acepte tanto Administrador como Directivo
function commonAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado.' });
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Sesión inválida o expirada.' });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error de autenticación.' });
  }
}

// POST /api/auth/login - Inicio de sesión unificado para Administrador y Directivo
router.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, ingrese su correo electrónico y contraseña.',
      });
    }

    if (typeof contrasena === 'string' && contrasena.length > 72) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña ingresada excede la longitud máxima permitida (72 caracteres).',
      });
    }

    const trimmedEmail = correo.trim().toLowerCase();

    // Buscar usuario en base de datos con datos de su escuela si aplica
    const result = await db.query(
      `SELECT u.id_usuario, u.id_escuela, u.nombre, u.apellidos, u.correo, u.contrasena, 
              u.rol, u.estado, u.es_principal, u.fecha_registro,
              e.nombre_escuela, e.cct, e.color_primario, e.color_secundario, e.color_complementario, e.tipo_logo
       FROM usuario u
       LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
       WHERE LOWER(u.correo) = $1`,
      [trimmedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas. Verifique su correo o contraseña.',
      });
    }

    const user = result.rows[0];

    // Verificar si la cuenta está activa
    if (user.estado && user.estado.toLowerCase() !== 'activo') {
      return res.status(403).json({
        success: false,
        message: 'Su cuenta se encuentra inactiva. Comuníquese con la administración.',
      });
    }

    // Permitir roles autorizados: Administrador o Directivo
    if (user.rol !== 'Administrador' && user.rol !== 'Directivo') {
      return res.status(403).json({
        success: false,
        message: 'Acceso no disponible para este rol en esta versión del sistema.',
      });
    }

    // Si es directivo, debe tener una escuela asignada
    if (user.rol === 'Directivo' && !user.id_escuela) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta de Directivo no tiene una escuela asociada asignada.',
      });
    }

    // Comparar contraseña con el hash bcrypt almacenado
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas. Verifique su correo o contraseña.',
      });
    }

    // Generar Token JWT seguro
    const tokenPayload = {
      id_usuario: user.id_usuario,
      id_escuela: user.id_escuela || null,
      correo: user.correo,
      rol: user.rol,
      es_principal: Boolean(user.es_principal),
      nombre: user.nombre,
      apellidos: user.apellidos,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id_usuario: user.id_usuario,
        id_escuela: user.id_escuela,
        nombre: user.nombre,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol,
        estado: user.estado,
        es_principal: Boolean(user.es_principal),
        fecha_registro: user.fecha_registro,
        escuela: user.id_escuela ? {
          id_escuela: user.id_escuela,
          nombre_escuela: user.nombre_escuela,
          cct: user.cct,
          color_primario: user.color_primario || '#722F37',
          color_secundario: user.color_secundario || '#4A1722',
          color_complementario: user.color_complementario || '#A64D5A',
          tiene_logo: Boolean(user.tipo_logo),
        } : null,
      },
    });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error en el servidor al procesar el inicio de sesión.',
    });
  }
});

// GET /api/auth/me - Perfil actual protegido (admite Administrador y Directivo)
router.get('/me', commonAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id_usuario, u.id_escuela, u.nombre, u.apellidos, u.correo, u.rol, u.estado, u.es_principal, u.fecha_registro,
              e.nombre_escuela, e.cct, e.color_primario, e.color_secundario, e.color_complementario, e.tipo_logo
       FROM usuario u
       LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
       WHERE u.id_usuario = $1`,
      [req.user.id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const row = result.rows[0];
    const user = {
      id_usuario: row.id_usuario,
      id_escuela: row.id_escuela,
      nombre: row.nombre,
      apellidos: row.apellidos,
      correo: row.correo,
      rol: row.rol,
      estado: row.estado,
      es_principal: Boolean(row.es_principal),
      fecha_registro: row.fecha_registro,
      escuela: row.id_escuela ? {
        id_escuela: row.id_escuela,
        nombre_escuela: row.nombre_escuela,
        cct: row.cct,
        color_primario: row.color_primario || '#722F37',
        color_secundario: row.color_secundario || '#4A1722',
        color_complementario: row.color_complementario || '#A64D5A',
        tiene_logo: Boolean(row.tipo_logo),
      } : null,
    };

    return res.json({ success: true, user });
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener datos de perfil.' });
  }
});

// PUT /api/auth/profile - Actualizar perfil
router.put('/profile', commonAuth, async (req, res) => {
  try {
    const { nombre, apellidos, currentPassword, newPassword } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }

    const userRes = await db.query(
      `SELECT * FROM usuario WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = userRes.rows[0];

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Debe ingresar su contraseña actual para establecer una nueva contraseña.',
        });
      }

      if (newPassword.length < 6 || newPassword.length > 72) {
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe tener entre 6 y 72 caracteres.',
        });
      }

      const match = await bcrypt.compare(currentPassword, user.contrasena);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña actual ingresada es incorrecta.',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await db.query(
        `UPDATE usuario 
         SET nombre = $1, apellidos = $2, contrasena = $3 
         WHERE id_usuario = $4`,
        [nombre.trim(), (apellidos || '').trim(), newHash, req.user.id_usuario]
      );
    } else {
      await db.query(
        `UPDATE usuario 
         SET nombre = $1, apellidos = $2 
         WHERE id_usuario = $3`,
        [nombre.trim(), (apellidos || '').trim(), req.user.id_usuario]
      );
    }

    const updatedRes = await db.query(
      `SELECT u.id_usuario, u.id_escuela, u.nombre, u.apellidos, u.correo, u.rol, u.estado, u.es_principal, u.fecha_registro,
              e.nombre_escuela, e.cct, e.color_primario, e.color_secundario, e.color_complementario, e.tipo_logo
       FROM usuario u
       LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
       WHERE u.id_usuario = $1`,
      [req.user.id_usuario]
    );

    const row = updatedRes.rows[0];
    const updatedUser = {
      id_usuario: row.id_usuario,
      id_escuela: row.id_escuela,
      nombre: row.nombre,
      apellidos: row.apellidos,
      correo: row.correo,
      rol: row.rol,
      estado: row.estado,
      es_principal: Boolean(row.es_principal),
      fecha_registro: row.fecha_registro,
      escuela: row.id_escuela ? {
        id_escuela: row.id_escuela,
        nombre_escuela: row.nombre_escuela,
        cct: row.cct,
        color_primario: row.color_primario || '#722F37',
        color_secundario: row.color_secundario || '#4A1722',
        color_complementario: row.color_complementario || '#A64D5A',
        tiene_logo: Boolean(row.tipo_logo),
      } : null,
    };

    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error en /api/auth/profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el perfil.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', commonAuth, (req, res) => {
  return res.json({ success: true, message: 'Sesión finalizada correctamente.' });
});

// GET /api/auth/activacion/verificar/:token - Comprobar validez de un token de activación
router.get('/activacion/verificar/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Token de activación no proporcionado.' });
    }

    const query = `
      SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.rol, u.token_activacion_expira, u.cuenta_activada,
             e.id_escuela, e.nombre_escuela, e.cct, e.estado_escuela
      FROM usuario u
      JOIN escuelas e ON u.id_escuela = e.id_escuela
      WHERE u.token_activacion = $1
    `;
    const result = await db.query(query, [token.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'El enlace de activación no es válido o ya fue utilizado anteriormente.',
      });
    }

    const row = result.rows[0];

    // Verificar si expiró
    if (row.token_activacion_expira && new Date() > new Date(row.token_activacion_expira)) {
      return res.status(410).json({
        success: false,
        code: 'TOKEN_EXPIRADO',
        message: 'El enlace de activación ha expirado. Puede solicitar un nuevo enlace de activación.',
        correo: row.correo,
      });
    }

    // Verificar si la escuela está aprobada/activa
    if ((row.estado_escuela || '').toLowerCase() !== 'activa') {
      return res.status(403).json({
        success: false,
        code: 'ESCUELA_NO_ACTIVA',
        message: 'La escuela vinculada a esta cuenta aún no ha sido aprobada o se encuentra inactiva.',
      });
    }

    return res.json({
      success: true,
      data: {
        nombre: row.nombre,
        correo: row.correo,
        nombre_escuela: row.nombre_escuela,
        cct: row.cct,
      },
    });
  } catch (error) {
    console.error('Error al verificar token de activación:', error);
    return res.status(500).json({ success: false, message: 'Error interno al validar el enlace de activación.' });
  }
});

// POST /api/auth/activacion/completar - Activar cuenta, guardar contraseña segura e iniciar sesión automáticamente
router.post('/activacion/completar', async (req, res) => {
  try {
    const { token, contrasena, confirmarContrasena } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Token de activación no proporcionado.' });
    }

    if (!contrasena || !confirmarContrasena) {
      return res.status(400).json({ success: false, message: 'Debe ingresar y confirmar su nueva contraseña.' });
    }

    if (contrasena !== confirmarContrasena) {
      return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden.' });
    }

    // Validación de seguridad de contraseña estricta en el backend:
    // - Mínimo 8 caracteres
    // - Al menos una mayúscula
    // - Al menos una minúscula
    // - Al menos un número
    // - Al menos un carácter especial
    const regexSeguridad = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,72}$/;
    if (!regexSeguridad.test(contrasena)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple con los requisitos de seguridad: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.',
      });
    }

    // Buscar al usuario por token
    const query = `
      SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.rol, u.estado, u.token_activacion_expira, u.cuenta_activada,
             e.id_escuela, e.nombre_escuela, e.cct, e.color_primario, e.color_secundario, e.color_complementario, e.tipo_logo, e.estado_escuela
      FROM usuario u
      JOIN escuelas e ON u.id_escuela = e.id_escuela
      WHERE u.token_activacion = $1
    `;
    const result = await db.query(query, [token.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'El enlace de activación es inválido o ya ha sido utilizado.',
      });
    }

    const user = result.rows[0];

    // Verificar expiración
    if (user.token_activacion_expira && new Date() > new Date(user.token_activacion_expira)) {
      return res.status(410).json({
        success: false,
        code: 'TOKEN_EXPIRADO',
        message: 'El enlace de activación ha expirado.',
      });
    }

    if ((user.estado_escuela || '').toLowerCase() !== 'activa') {
      return res.status(403).json({
        success: false,
        message: 'La institución educativa asociada no está activa.',
      });
    }

    // Generar hash seguro con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(contrasena, salt);

    // Actualizar usuario: invalidar token, marcar cuenta activada, actualizar contraseña y asegurar rol Directivo y estado Activo
    await db.query(
      `UPDATE usuario
       SET contrasena = $1,
           token_activacion = NULL,
           token_activacion_expira = NULL,
           cuenta_activada = TRUE,
           estado = 'Activo',
           rol = 'Directivo'
       WHERE id_usuario = $2`,
      [passHash, user.id_usuario]
    );

    // Iniciar sesión automáticamente: generar JWT idéntico al login
    const tokenPayload = {
      id_usuario: user.id_usuario,
      id_escuela: user.id_escuela,
      correo: user.correo,
      rol: 'Directivo',
      es_principal: false,
      nombre: user.nombre,
      apellidos: user.apellidos,
    };

    const sessionToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    return res.json({
      success: true,
      message: '¡Tu cuenta ha sido activada correctamente! Bienvenido a SICARA.',
      token: sessionToken,
      user: {
        id_usuario: user.id_usuario,
        id_escuela: user.id_escuela,
        nombre: user.nombre,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: 'Directivo',
        estado: 'Activo',
        es_principal: false,
        escuela: {
          id_escuela: user.id_escuela,
          nombre_escuela: user.nombre_escuela,
          cct: user.cct,
          color_primario: user.color_primario || '#722F37',
          color_secundario: user.color_secundario || '#4A1722',
          color_complementario: user.color_complementario || '#A64D5A',
          tiene_logo: Boolean(user.tipo_logo),
        },
      },
    });
  } catch (error) {
    console.error('Error al completar activación de cuenta:', error);
    return res.status(500).json({ success: false, message: 'Error interno al activar la cuenta.' });
  }
});

// POST /api/auth/activacion/solicitar-nuevo - Solicitar un nuevo enlace de activación si expiró
router.post('/activacion/solicitar-nuevo', async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo || !correo.trim()) {
      return res.status(400).json({ success: false, message: 'Ingrese su correo electrónico.' });
    }

    const cleanEmail = correo.trim().toLowerCase();
    const userRes = await db.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.rol, e.nombre_escuela, e.cct
       FROM usuario u
       JOIN escuelas e ON u.id_escuela = e.id_escuela
       WHERE LOWER(u.correo) = $1 AND u.rol = 'Directivo'`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró una cuenta directiva con ese correo electrónico.',
      });
    }

    const directivo = userRes.rows[0];
    const nuevoToken = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

    await db.query(
      `UPDATE usuario 
       SET token_activacion = $1, token_activacion_expira = $2 
       WHERE id_usuario = $3`,
      [nuevoToken, expira, directivo.id_usuario]
    );

    // Enviar correo con el nuevo enlace
    const notifRes = await notificarEscuelaPorCorreo({
      destinatario: directivo.correo,
      nombreEscuela: directivo.nombre_escuela,
      estado: 'Aprobada',
      solicitudData: {
        nombre_responsable: directivo.nombre,
        nombre_escuela: directivo.nombre_escuela,
        cct: directivo.cct,
        token_activacion: nuevoToken,
      },
    });

    return res.json({
      success: true,
      message: 'Se ha enviado un nuevo enlace de activación a su correo electrónico.',
      emailSent: notifRes.sent,
    });
  } catch (error) {
    console.error('Error al generar nuevo enlace de activación:', error);
    return res.status(500).json({ success: false, message: 'Error interno al procesar la solicitud.' });
  }
});

// POST /api/auth/recuperar/solicitar - Solicitar restablecimiento de contraseña
router.post('/recuperar/solicitar', async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo || !correo.trim()) {
      return res.status(400).json({ success: false, message: 'Por favor ingrese su correo electrónico.' });
    }

    const cleanEmail = correo.trim().toLowerCase();
    const userRes = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.rol, u.estado, e.nombre_escuela
       FROM usuario u
       LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
       WHERE LOWER(u.correo) = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      // Mensaje neutro por seguridad para no revelar si el correo existe
      return res.json({
        success: true,
        message: 'Si el correo electrónico proporcionado se encuentra registrado en SICARA, recibirá un enlace para restablecer su contraseña en los próximos minutos.',
      });
    }

    const user = userRes.rows[0];

    // Generar token criptográfico seguro de 32 bytes con vigencia de 2 horas
    const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    await db.query(
      `UPDATE usuario
       SET token_recuperacion = $1, token_recuperacion_expira = $2
       WHERE id_usuario = $3`,
      [tokenRecuperacion, expira, user.id_usuario]
    );

    // Enviar correo de recuperación
    const emailRes = await enviarCorreoRecuperacion({
      destinatario: user.correo,
      nombreUsuario: `${user.nombre} ${user.apellidos || ''}`.trim(),
      token: tokenRecuperacion,
    });

    return res.json({
      success: true,
      message: 'Se ha enviado un enlace seguro para restablecer su contraseña a su correo electrónico.',
      emailSent: emailRes.sent,
    });
  } catch (error) {
    console.error('Error en /api/auth/recuperar/solicitar:', error);
    return res.status(500).json({ success: false, message: 'Error interno al procesar la solicitud de recuperación.' });
  }
});

// GET /api/auth/recuperar/verificar/:token - Comprobar validez del token de restablecimiento
router.get('/recuperar/verificar/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Token de restablecimiento no proporcionado.' });
    }

    const query = `
      SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.rol, u.token_recuperacion_expira,
             e.nombre_escuela, e.cct
      FROM usuario u
      LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
      WHERE u.token_recuperacion = $1
    `;
    const result = await db.query(query, [token.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'El enlace de restablecimiento no es válido o ya fue utilizado anteriormente.',
      });
    }

    const row = result.rows[0];

    if (row.token_recuperacion_expira && new Date() > new Date(row.token_recuperacion_expira)) {
      return res.status(410).json({
        success: false,
        code: 'TOKEN_EXPIRADO',
        message: 'El enlace de restablecimiento ha expirado. Por seguridad, solicite un nuevo enlace.',
        correo: row.correo,
      });
    }

    return res.json({
      success: true,
      data: {
        nombre: row.nombre,
        correo: row.correo,
        rol: row.rol,
        nombre_escuela: row.nombre_escuela,
        cct: row.cct,
      },
    });
  } catch (error) {
    console.error('Error al verificar token de recuperación:', error);
    return res.status(500).json({ success: false, message: 'Error interno al validar el enlace.' });
  }
});

// POST /api/auth/recuperar/completar - Guardar nueva contraseña cifrada e invalidar token
router.post('/recuperar/completar', async (req, res) => {
  try {
    const { token, contrasena, confirmarContrasena } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Token de restablecimiento no proporcionado.' });
    }

    if (!contrasena || !confirmarContrasena) {
      return res.status(400).json({ success: false, message: 'Debe ingresar y confirmar su nueva contraseña.' });
    }

    if (contrasena !== confirmarContrasena) {
      return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden.' });
    }

    // Mismos requisitos estrictos de seguridad de SICARA
    const regexSeguridad = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,72}$/;
    if (!regexSeguridad.test(contrasena)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple con los requisitos: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.',
      });
    }

    const query = `
      SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.rol, u.estado, u.token_recuperacion_expira,
             u.id_escuela, e.nombre_escuela, e.cct, e.color_primario, e.color_secundario, e.color_complementario, e.tipo_logo
      FROM usuario u
      LEFT JOIN escuelas e ON u.id_escuela = e.id_escuela
      WHERE u.token_recuperacion = $1
    `;
    const result = await db.query(query, [token.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: 'El enlace de restablecimiento es inválido o ya ha sido utilizado.',
      });
    }

    const user = result.rows[0];

    if (user.token_recuperacion_expira && new Date() > new Date(user.token_recuperacion_expira)) {
      return res.status(410).json({
        success: false,
        code: 'TOKEN_EXPIRADO',
        message: 'El enlace de restablecimiento ha expirado. Solicite un nuevo enlace.',
      });
    }

    // Hashear con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(contrasena, salt);

    // Invalidar token de recuperación y actualizar contraseña
    await db.query(
      `UPDATE usuario
       SET contrasena = $1,
           token_recuperacion = NULL,
           token_recuperacion_expira = NULL,
           cuenta_activada = TRUE,
           estado = 'Activo'
       WHERE id_usuario = $2`,
      [passHash, user.id_usuario]
    );

    // Iniciar sesión automáticamente
    const tokenPayload = {
      id_usuario: user.id_usuario,
      id_escuela: user.id_escuela || null,
      correo: user.correo,
      rol: user.rol,
      es_principal: Boolean(user.es_principal),
      nombre: user.nombre,
      apellidos: user.apellidos,
    };

    const sessionToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    return res.json({
      success: true,
      message: '¡Tu contraseña ha sido restablecida exitosamente! Sesión iniciada.',
      token: sessionToken,
      user: {
        id_usuario: user.id_usuario,
        id_escuela: user.id_escuela,
        nombre: user.nombre,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol,
        estado: 'Activo',
        es_principal: Boolean(user.es_principal),
        escuela: user.id_escuela ? {
          id_escuela: user.id_escuela,
          nombre_escuela: user.nombre_escuela,
          cct: user.cct,
          color_primario: user.color_primario || '#722F37',
          color_secundario: user.color_secundario || '#4A1722',
          color_complementario: user.color_complementario || '#A64D5A',
          tiene_logo: Boolean(user.tipo_logo),
        } : null,
      },
    });
  } catch (error) {
    console.error('Error al completar restablecimiento de contraseña:', error);
    return res.status(500).json({ success: false, message: 'Error interno al restablecer la contraseña.' });
  }
});

module.exports = router;
