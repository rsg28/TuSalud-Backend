const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: true, // Permite requests de cualquier origen
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-TuSalud-Acting-User-Id',
    'Accept',
    'Accept-Language',
  ],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'TuSalud API - Sistema de Gestión Médica Ocupacional' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/empresas', require('./routes/empresasRoutes'));
app.use('/api/sedes', require('./routes/sedesRoutes'));
app.use('/api/pacientes', require('./routes/pacientesRoutes'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/cotizaciones', require('./routes/cotizacionesRoutes'));
app.use('/api/facturas', require('./routes/facturasRoutes'));
app.use('/api/pedidos', require('./routes/pedidosRoutes'));
app.use('/api/solicitudes-agregar-examenes', require('./routes/solicitudesAgregarRoutes'));
app.use('/api/precios', require('./routes/preciosEmpresaRoutes'));
app.use('/api/emo-perfiles', require('./routes/emoPerfilesRoutes'));
app.use('/api/import', require('./routes/importEmpleadosPdfRoutes'));
app.use('/api/import', require('./routes/importDocumentoEmpleadosRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

// Importar pool para verificar conexión
const pool = require('./config/database');

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 TuSalud Backend API Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'tusalud'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
  const jwtOff =
    String(process.env.DISABLE_JWT_AUTH || '').toLowerCase() === 'true' ||
    process.env.DISABLE_JWT_AUTH === '1';
  if (jwtOff) {
    const bid = String(process.env.AUTH_BYPASS_USER_ID || '').trim();
    console.log('⚠️  JWT deshabilitado (DISABLE_JWT_AUTH). El Bearer no define la sesión.');
    console.log(
      '   Sesión: cabecera X-TuSalud-Acting-User-Id (id del usuario en el front) → si falta o no existe en BD,'
    );
    console.log(
      `   fallback: ${bid ? `AUTH_BYPASS_USER_ID=${bid}` : 'primer manager activo en BD'}`
    );
  }
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  // Verificar conexión a la base de datos
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection verified');
    connection.release();
  } catch (err) {
    console.error('⚠️  Database connection warning:', err.message);
    console.error('   Server will start but database operations may fail');
  }
  console.log('');
});

module.exports = app;
