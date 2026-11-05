const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

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

module.exports = router;
