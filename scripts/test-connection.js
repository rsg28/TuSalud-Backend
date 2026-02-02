const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tusaludDB',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  };

  console.log('🔍 Testing database connection...');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  console.log('');

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connection successful!');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful!');
    
    // Check if database exists and has tables
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?",
      [config.database]
    );
    
    console.log(`📊 Tables in database: ${tables[0].count}`);
    
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed!');
    console.error('');
    console.error('Error details:');
    console.error(`   Code: ${err.code}`);
    console.error(`   Message: ${err.message}`);
    console.error('');
    console.error('💡 Troubleshooting:');
    
    if (err.code === 'ECONNREFUSED') {
      console.error('   → MySQL server is not running or not accessible');
      console.error('   → Check if MySQL service is started');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Wrong username or password');
      console.error('   → Check your .env file credentials');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('   → Database does not exist');
      console.error('   → Run: mysql -u root -p < database_schema.sql');
    } else {
      console.error('   → Check your MySQL configuration');
      console.error('   → Verify .env file settings');
    }
    
    process.exit(1);
  }
}

testConnection();
