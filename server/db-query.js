/**
 * db-query.js — Helper para consultas y escritura en MySQL
 *
 * Uso:
 *   import db from './db-query.js';
 *
 *   // SELECT
 *   const rows = await db.query('SELECT * FROM users WHERE active = ?', [1]);
 *
 *   // INSERT  → devuelve { insertId, affectedRows }
 *   const result = await db.insert('users', { name: 'Ana', email: 'ana@mail.com' });
 *
 *   // UPDATE  → devuelve { affectedRows, changedRows }
 *   const result = await db.update('users', { name: 'Ana López' }, 'id = ?', [3]);
 *
 *   // DELETE  → devuelve { affectedRows }
 *   const result = await db.delete('users', 'id = ?', [3]);
 *
 *   // TRANSACTION
 *   await db.transaction(async (conn) => {
 *     await conn.execute('INSERT INTO orders ...', [...]);
 *     await conn.execute('UPDATE stock ...', [...]);
 *   });
 */

import pool from './db.js';

const dbQuery = {
  /**
   * Ejecuta cualquier query SQL con parámetros opcionales.
   * @param {string} sql
   * @param {Array}  params
   * @returns {Promise<Array>} filas resultado
   */
  async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Obtiene una sola fila (o undefined si no existe).
   * @param {string} sql
   * @param {Array}  params
   * @returns {Promise<Object|undefined>}
   */
  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0];
  },

  /**
   * INSERT dinámico a partir de un objeto plano.
   * @param {string} table  Nombre de la tabla
   * @param {Object} data   Objeto { columna: valor }
   * @returns {Promise<{ insertId: number, affectedRows: number }>}
   */
  async insert(table, data) {
    const cols   = Object.keys(data);
    const values = Object.values(data);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${table}\` (\`${cols.join('`, `')}\`) VALUES (${placeholders})`;
    const [result] = await pool.execute(sql, values);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  },

  /**
   * UPDATE dinámico.
   * @param {string} table     Nombre de la tabla
   * @param {Object} data      Campos a actualizar { columna: valor }
   * @param {string} where     Condición WHERE (ej: "id = ?")
   * @param {Array}  whereParams Valores para la condición
   * @returns {Promise<{ affectedRows: number, changedRows: number }>}
   */
  async update(table, data, where, whereParams = []) {
    const sets   = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    const sql = `UPDATE \`${table}\` SET ${sets} WHERE ${where}`;
    const [result] = await pool.execute(sql, values);
    return { affectedRows: result.affectedRows, changedRows: result.changedRows };
  },

  /**
   * DELETE con condición.
   * @param {string} table
   * @param {string} where        Condición WHERE (ej: "id = ?")
   * @param {Array}  whereParams
   * @returns {Promise<{ affectedRows: number }>}
   */
  async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
    const [result] = await pool.execute(sql, whereParams);
    return { affectedRows: result.affectedRows };
  },

  /**
   * Ejecuta múltiples operaciones dentro de una transacción.
   * Si alguna falla, hace ROLLBACK automático.
   * @param {Function} fn  async (conn) => { ... }
   */
  async transaction(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await fn(conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default dbQuery;
