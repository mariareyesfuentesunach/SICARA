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

// Servir frontend compilado en producción
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint de API no encontrado.' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <title>SICARA - Sistema de Control Escolar Rural</title>
            <style>
              body { font-family: sans-serif; background: #F8F5F5; color: #292329; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; max-width: 500px; border-top: 5px solid #722F37; }
              h1 { color: #722F37; margin-bottom: 0.5rem; }
              p { color: #555; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>SICARA</h1>
              <p>El servidor backend de SICARA está activo y conectado a PostgreSQL.</p>
              <p>Por favor ejecute la compilación del cliente o inicie Vite en modo de desarrollo.</p>
            </div>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 SERVIDOR SICARA ACTIVO EN PUERTO: ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`📡 PostgreSQL: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`=======================================================`);
});
