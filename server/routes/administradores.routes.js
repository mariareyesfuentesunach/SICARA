const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Middleware para verificar que el usuario sea el Administrador Principal
function principalAdminOnly(req, res, next) {
  if (!req.user || !req.user.es_principal) {
    return res.status(403).json({
      success: false,
      message: 'Operación restringida: Solo el Administrador Principal tiene autorización para crear o gestionar cuentas administrativas.',
    });
  }
  next();
}

// GET /api/administradores - Listar administradores (Principal y Adicionales)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id_usuario,
        nombre,
        apellidos,
        correo,
        rol,
        estado,
        es_principal,
        fecha_registro
      FROM usuario
      WHERE rol = 'Administrador'
      ORDER BY 
        CASE WHEN es_principal THEN 1 ELSE 2 END,
        fecha_registro ASC
    `);

    return res.json({
      success: true,
      administradores: result.rows,
      currentUserIsPrincipal: Boolean(req.user.es_principal),
    });
  } catch (error) {
    console.error('Error al listar administradores:', error);
    return res.status(500).json({ success: false, message: 'Error interno al consultar las cuentas de administrador.' });
  }
});

// POST /api/administradores - Crear nuevo Administrador General adicional (Solo Principal)
router.post('/', authMiddleware, principalAdminOnly, async (req, res) => {
  try {
    const { nombre, apellidos, correo, contrasena, confirmar_contrasena } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }

    if (!correo || !correo.trim()) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es obligatorio.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = correo.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'El formato del correo electrónico no es válido.' });
    }

    if (!contrasena || contrasena.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña inicial debe tener al menos 6 caracteres.',
      });
    }

    if (contrasena !== confirmar_contrasena) {
      return res.status(400).json({
        success: false,
        message: 'La confirmación de la contraseña no coincide con la contraseña inicial.',
      });
    }

    // Verificar si el correo ya existe en la base de datos
    const existing = await db.query(
      'SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1',
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ingresado ya se encuentra registrado en el sistema.',
      });
    }

    // Hashear contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(contrasena, salt);

    // Insertar administrador adicional (es_principal = false)
    const insertRes = await db.query(
      `INSERT INTO usuario (
        nombre, apellidos, correo, contrasena, rol, estado, es_principal, fecha_registro
      ) VALUES ($1, $2, $3, $4, 'Administrador', 'Activo', false, NOW())
      RETURNING id_usuario, nombre, apellidos, correo, rol, estado, es_principal, fecha_registro`,
      [nombre.trim(), (apellidos || '').trim(), cleanEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: `El Administrador General adicional "${nombre.trim()}" ha sido creado exitosamente.`,
      administrador: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error al crear administrador adicional:', error);
    return res.status(500).json({ success: false, message: 'Error interno al registrar el administrador.' });
  }
});

// PUT /api/administradores/:id - Actualizar datos de un administrador (Solo Principal)
router.put('/:id', authMiddleware, principalAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, correo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }

    if (!correo || !correo.trim()) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es obligatorio.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = correo.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'El formato del correo electrónico no es válido.' });
    }

    // Verificar existencia del usuario
    const userRes = await db.query(
      'SELECT id_usuario, es_principal, correo FROM usuario WHERE id_usuario = $1 AND rol = $2',
      [id, 'Administrador']
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta de administrador no encontrada.' });
    }

    // Si se cambió el correo, validar duplicidad
    if (userRes.rows[0].correo.toLowerCase() !== cleanEmail) {
      const dupRes = await db.query(
        'SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1 AND id_usuario != $2',
        [cleanEmail, id]
      );
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'El correo ya está en uso por otra cuenta.' });
      }
    }

    const updateRes = await db.query(
      `UPDATE usuario 
       SET nombre = $1, apellidos = $2, correo = $3 
       WHERE id_usuario = $4
       RETURNING id_usuario, nombre, apellidos, correo, rol, estado, es_principal, fecha_registro`,
      [nombre.trim(), (apellidos || '').trim(), cleanEmail, id]
    );

    return res.json({
      success: true,
      message: 'Datos del administrador actualizados exitosamente.',
      administrador: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar administrador:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar datos.' });
  }
});

// PUT /api/administradores/:id/estado - Activar / Inactivar administrador adicional (Solo Principal)
router.put('/:id/estado', authMiddleware, principalAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !['Activo', 'Inactivo'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido. Debe ser "Activo" o "Inactivo".' });
    }

    const userRes = await db.query(
      'SELECT id_usuario, nombre, es_principal, rol FROM usuario WHERE id_usuario = $1',
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta de administrador no encontrada.' });
    }

    const target = userRes.rows[0];

    // Salvaguarda inviolable: El Administrador Principal no puede ser desactivado
    if (target.es_principal) {
      return res.status(403).json({
        success: false,
        message: 'Acción prohibida: No es posible desactivar la cuenta del Administrador Principal.',
      });
    }

    const updateRes = await db.query(
      `UPDATE usuario 
       SET estado = $1 
       WHERE id_usuario = $2
       RETURNING id_usuario, nombre, apellidos, correo, rol, estado, es_principal`,
      [estado, id]
    );

    return res.json({
      success: true,
      message: `El estado del administrador "${target.nombre}" ha sido actualizado a "${estado}".`,
      administrador: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error al cambiar estado de administrador:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar estado.' });
  }
});

module.exports = router;

