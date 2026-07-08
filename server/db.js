/**
 * db.js — Módulo de conexión a MySQL
 *
 * Crea un pool de conexiones reutilizables.
 * Configura las variables de entorno en un archivo .env en la raíz del proyecto.
 *
 * Variables requeridas:
 *   DB_HOST     (default: localhost)
 *   DB_PORT     (default: 3306)
 *   DB_USER     (default: root)
 *   DB_PASSWORD
 *   DB_NAME
 *   DB_POOL_LIMIT (default: 10)
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DB_NAME) {
  console.error('❌ DB_NAME no está definido. Crea un archivo .env basado en .env.example');
  process.exit(1);
}

const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            Number(process.env.DB_PORT) || 3306,
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
  queueLimit:      0,
  timezone:        '+00:00',
});

/**
 * Prueba la conexión al iniciar.
 * Lanza un error si no se puede conectar.
 */
export async function testConnection() {
  const conn = await pool.getConnection();
  // Verificar que la base de datos realmente existe y es accesible
  await conn.execute('SELECT 1');
  console.log(`✅ MySQL conectado → ${process.env.DB_NAME}@${process.env.DB_HOST || 'localhost'}`);
  conn.release();
}

export default pool;
