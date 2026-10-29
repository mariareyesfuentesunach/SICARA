const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, ingrese su correo electrónico y contraseña.',
      });
    }

    const trimmedEmail = correo.trim().toLowerCase();

    // Buscar usuario en base de datos
    const result = await db.query(
      `SELECT id_usuario, id_escuela, nombre, apellidos, correo, contrasena, rol, estado, fecha_registro
       FROM usuario
       WHERE LOWER(correo) = $1`,
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
        message: 'Su cuenta se encuentra inactiva. Comuníquese con soporte.',
      });
    }

    // Regla de etapa 1: Acceso exclusivo a la cuenta del Administrador General
    if (user.rol !== 'Administrador') {
      return res.status(403).json({
        success: false,
        message: 'Por el momento, el acceso está restringido únicamente al Administrador General.',
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

    // Generar Token JWT seguro con expiración de 12 horas
    const tokenPayload = {
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol,
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
        nombre: user.nombre,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol,
        estado: user.estado,
        fecha_registro: user.fecha_registro,
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

// GET /api/auth/me - Perfil actual protegido
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id_usuario, id_escuela, nombre, apellidos, correo, rol, estado, fecha_registro
       FROM usuario
       WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener datos de perfil.' });
  }
});

// PUT /api/auth/profile - Actualizar perfil del administrador
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nombre, apellidos, currentPassword, newPassword } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }

    // Obtener datos actuales
    const userRes = await db.query(
      `SELECT * FROM usuario WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = userRes.rows[0];

    // Si se desea cambiar contraseña, validar la contraseña actual
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Debe ingresar su contraseña actual para establecer una nueva contraseña.',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres.',
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
      `SELECT id_usuario, id_escuela, nombre, apellidos, correo, rol, estado, fecha_registro
       FROM usuario
       WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );

    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente.',
      user: updatedRes.rows[0],
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
router.post('/logout', authMiddleware, (req, res) => {
  return res.json({ success: true, message: 'Sesión finalizada correctamente.' });
});

module.exports = router;
