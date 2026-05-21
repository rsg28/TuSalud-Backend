/**
 * Ejecuta UNA migración SQL de forma segura (idempotente con detección de errores conocidos).
 * Uso: node scripts/run-migration.cjs scripts/migration_factura_detalle_cotizacion_id.sql
 *
 * Usa las variables de .env del backend automáticamente.
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Uso: node scripts/run-migration.cjs <archivo.sql>');
  process.exit(1);
}

const absolutePath = path.isAbsolute(sqlFile) ? sqlFile : path.resolve(process.cwd(), sqlFile);
if (!fs.existsSync(absolutePath)) {
  console.error('❌ Archivo no encontrado:', absolutePath);
  process.exit(1);
}

const sql = fs.readFileSync(absolutePath, 'utf8');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  console.log(`\n🔗 Conectado a ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  console.log(`📄 Ejecutando: ${path.basename(absolutePath)}\n`);

  try {
    await connection.query(sql);
    console.log('✅ Migración aplicada correctamente.\n');
  } catch (err) {
    // MySQL error 1060: Duplicate column name — ya fue aplicada antes
    if (err.errno === 1060 || /duplicate column/i.test(err.message)) {
      console.log('⚠️  La columna ya existe en la tabla — migración ya fue aplicada previamente. OK.\n');
    }
    // MySQL error 1826/1050: duplicate FK / constraint
    else if (err.errno === 1826 || err.errno === 1050) {
      console.log('⚠️  El índice o constraint ya existe — migración ya fue aplicada previamente. OK.\n');
    } else {
      console.error('❌ Error al aplicar la migración:\n', err.message);
      await connection.end();
      process.exit(1);
    }
  }

  await connection.end();
  console.log('🔌 Conexión cerrada.');
})();
