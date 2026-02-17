const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tusalud',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Configuraciones adicionales para mejor manejo de errores
  reconnect: true,
  timezone: '+00:00',
  charset: 'utf8mb4'
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`📊 Connected to: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('💡 Make sure:');
    console.error('   1. MySQL server is running');
    console.error('   2. Database "tusalud" exists (run database/tusalud_schema_mysql.sql)');
    console.error('   3. Credentials in .env are correct');
    console.error(`   4. Connection details: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}`);
    return false;
  }
}

// Probar conexión al iniciar
testConnection();

// Manejar errores de conexión
pool.on('connection', (connection) => {
  console.log('🔌 New connection established as id ' + connection.threadId);
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Attempting to reconnect...');
  }
});

module.exports = pool;
