const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sicara_rural_secret_jwt_key_2026_super_secure_wine';

/**
 * Middleware para rutas exclusivas de Administrador General
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Acceso no autorizado: Token no proporcionado.' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Sesión inválida o expirada. Por favor inicie sesión de nuevo.' });
      }

      // Validar que el rol sea Administrador
      if (decoded.rol !== 'Administrador') {
        return res.status(403).json({ success: false, message: 'Acceso denegado: Se requieren privilegios de Administrador General.' });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Error en authMiddleware:', error);
    return res.status(500).json({ success: false, message: 'Error interno en verificación de autorización.' });
  }
}

/**
 * Middleware para rutas exclusivas de Directivo
 */
function directivoMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Acceso no autorizado: Token no proporcionado.' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Sesión inválida o expirada. Por favor inicie sesión de nuevo.' });
      }

      if (decoded.rol !== 'Directivo') {
        return res.status(403).json({ success: false, message: 'Acceso denegado: Se requieren privilegios de Directivo Institucional.' });
      }

      if (!decoded.id_escuela) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: La cuenta de Directivo no tiene una escuela asociada.' });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Error en directivoMiddleware:', error);
    return res.status(500).json({ success: false, message: 'Error interno en verificación de autorización.' });
  }
}

module.exports = {
  authMiddleware,
  directivoMiddleware,
  JWT_SECRET,
};
