#!/usr/bin/env node
/**
 * Lista usuarios en RDS usando las variables DB_* del .env del backend.
 *
 * Uso en EC2:
 *   cd ~/app/TuSalud-Backend
 *   node scripts/listar-usuarios-por-rol.cjs
 *   node scripts/listar-usuarios-por-rol.cjs manager
 *   node scripts/listar-usuarios-por-rol.cjs --resumen
 *
 * No uses `mysql -u admin -p` a mano: la contraseña correcta está en .env
 * (y puede llevar caracteres especiales o comillas).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const arg = process.argv[2];
  const resumen = arg === '--resumen';
  const rol = resumen || !arg ? null : arg;

  const pwd = String(process.env.DB_PASSWORD || '').replace(/^'+|'+$/g, '');
  if (!process.env.DB_HOST || !process.env.DB_USER || !pwd) {
    console.error('Faltan DB_HOST, DB_USER o DB_PASSWORD en .env');
    process.exit(1);
  }

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: pwd,
    database: process.env.DB_NAME || 'tusalud',
    port: Number(process.env.DB_PORT) || 3306,
    connectTimeout: 20000,
  });

  try {
    if (resumen) {
      const [rows] = await pool.execute(
        `SELECT rol, COUNT(*) AS total,
                SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS activos
         FROM usuarios GROUP BY rol ORDER BY rol`
      );
      console.log('\nUsuarios por rol:\n');
      console.table(rows);
      return;
    }

    let sql = `SELECT id, nombre_usuario, email, nombre_completo, rol, activo,
                      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS creado
               FROM usuarios`;
    const params = [];
    if (rol) {
      sql += ' WHERE rol = ?';
      params.push(rol);
    }
    sql += ' ORDER BY rol, id';

    const [rows] = await pool.execute(sql, params);
    const titulo = rol ? `Usuarios con rol "${rol}"` : 'Todos los usuarios';
    console.log(`\n${titulo}: ${rows.length}\n`);
    if (rows.length === 0) {
      console.log('(ninguno)');
    } else {
      console.table(rows);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Error:', e.message || e);
  if (String(e.code) === 'ER_ACCESS_DENIED_ERROR') {
    console.error('\nLa contraseña en .env no coincide con RDS. Revisa DB_PASSWORD en ~/app/TuSalud-Backend/.env');
    console.error('o restablece la contraseña del usuario master en la consola AWS → RDS.');
  }
  process.exit(1);
});
