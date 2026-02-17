/**
 * Crea un usuario de prueba para poder hacer login.
 * Uso: node scripts/seed-usuario-test.js
 *
 * Usuario creado:
 *   Email:    test@tusalud.com
 *   Password: 123456
 *   Rol:      manager (puedes cambiarlo a vendedor o cliente)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const EMAIL = 'test@tusalud.com';
const PASSWORD = '123456';
const NOMBRE_USUARIO = 'test';
const NOMBRE_COMPLETO = 'Usuario Prueba';
const ROL = 'manager'; // 'manager' | 'vendedor' | 'cliente'

async function main() {
  try {
    const [existing] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [EMAIL]);
    if (existing.length > 0) {
      console.log('Ya existe un usuario con email', EMAIL);
      console.log('Si no recuerdas la contraseña, bórralo en la BD y vuelve a ejecutar este script.');
      process.exit(0);
      return;
    }
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    await pool.execute(
      `INSERT INTO usuarios (nombre_usuario, email, password_hash, nombre_completo, rol, activo)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [NOMBRE_USUARIO, EMAIL, password_hash, NOMBRE_COMPLETO, ROL]
    );
    console.log('Usuario de prueba creado correctamente.');
    console.log('  Email:', EMAIL);
    console.log('  Contraseña:', PASSWORD);
    console.log('  Rol:', ROL);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

main();
