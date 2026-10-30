const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const escuelasRoutes = require('./routes/escuelas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/escuelas', escuelasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await db.query('SELECT NOW() as current_time');
    res.json({
      status: 'OK',
      system: 'SICARA - Administrador General',
      timestamp: dbCheck.rows[0].current_time,
      database: 'Conectada exitosamente',
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Fallo al conectar con la base de datos PostgreSQL.',
      error: err.message,
    });
  }
});

// Redirigir /api o /api/ a la interfaz web si se abre en el navegador
app.get(['/api', '/api/'], (req, res) => {
  res.redirect('/');
});

// Servir frontend compilado en producción
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint de API no encontrado.' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 SERVIDOR SICARA ACTIVO EN PUERTO: ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`📡 PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`=======================================================`);
});

