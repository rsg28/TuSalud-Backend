const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración del pool. Antes el límite estaba en 10 conexiones con cola
// ilimitada (`queueLimit: 0`), lo que en multi-vendedor producía starvation y
// crecimiento de memoria sin freno bajo ráfagas. Subimos el `connectionLimit`
// y acotamos la cola para que las requests fallen rápido en lugar de quedarse
// colgadas para siempre. Configurable por env por si hace falta ajustar sin
// tocar código en cada entorno.
const parsePositiveInt = (raw, def) => {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tusalud',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: parsePositiveInt(process.env.DB_POOL_LIMIT, 50),
  queueLimit: parsePositiveInt(process.env.DB_POOL_QUEUE_LIMIT, 200),
  connectTimeout: parsePositiveInt(process.env.DB_CONNECT_TIMEOUT_MS, 10000),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00',
  charset: 'utf8mb4',
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

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Attempting to reconnect...');
  }
});

module.exports = pool;
