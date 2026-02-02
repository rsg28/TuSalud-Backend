const fs = require('fs');
const path = require('path');

console.log('🔍 Checking TuSalud Backend setup...');
console.log('');

let allGood = true;

// Verificar archivo .env
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('   Create .env file from env.example');
  allGood = false;
} else {
  console.log('✅ .env file exists');
  
  // Verificar que tenga las variables necesarias
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required variables: ${missingVars.join(', ')}`);
    allGood = false;
  } else {
    console.log('✅ Required environment variables found');
  }
}

// Verificar node_modules
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ node_modules not found!');
  console.error('   Run: npm install');
  allGood = false;
} else {
  console.log('✅ Dependencies installed');
}

// Verificar database_schema.sql
const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('❌ database_schema.sql not found!');
  allGood = false;
} else {
  console.log('✅ database_schema.sql exists');
}

console.log('');
if (allGood) {
  console.log('✅ Setup looks good!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Make sure MySQL is running');
  console.log('  2. Create database: mysql -u root -p < database_schema.sql');
  console.log('  3. Test connection: npm run test-db');
  console.log('  4. Start server: npm run dev');
} else {
  console.log('❌ Setup incomplete. Please fix the issues above.');
  process.exit(1);
}
