/**
 * index.js — Servidor Express de ejemplo
 *
 * Levanta una API REST mínima que consume los módulos db.js y db-query.js.
 * Sirve como punto de entrada del backend.
 *
 * Arrancar:
 *   node server/index.js
 */

import express from 'express';
import cors from 'cors';
import { testConnection } from './db.js';
import db from './db-query.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// Permitir peticiones desde el frontend Vite (cualquier origen en dev)
app.use(cors());
// Imágenes en base64 pueden ser grandes — subir límite a 20mb
app.use(express.json({ limit: '20mb' }));

// ─── Verificación de salud ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── REPORTES ─────────────────────────────────────────────────────────────────

/**
 * POST /api/reportes
 * Guarda o actualiza un layout de reporte.
 * Body JSON:
 *   { layout_num, layout_titulo, descripcion, imagen_base64, imagen_mime, imagen_nombre, usuario_id_usu }
 * Si ya existe un reporte para ese layout_num, lo actualiza (upsert).
 */
app.post('/api/reportes', async (req, res) => {
  try {
    const { layout_num, layout_titulo, descripcion, imagen_base64, imagen_mime, imagen_nombre, usuario_id_usu } = req.body;

    if (!layout_num || !layout_titulo) {
      return res.status(400).json({ error: 'layout_num y layout_titulo son obligatorios' });
    }

    // Convertir base64 → Buffer de bytes
    const imagenBuffer = imagen_base64 ? Buffer.from(imagen_base64, 'base64') : null;

    // Verificar si ya existe un reporte para este layout
    const existing = await db.queryOne('SELECT id_reporte FROM reportes WHERE layout_num = ?', [layout_num]);

    if (existing) {
      // UPDATE
      const updateData = { layout_titulo, descripcion: descripcion || null };
      if (imagenBuffer) {
        updateData.imagen_bytes  = imagenBuffer;
        updateData.imagen_mime   = imagen_mime   || 'image/jpeg';
        updateData.imagen_nombre = imagen_nombre || null;
      }
      if (usuario_id_usu) updateData.usuario_id_usu = usuario_id_usu;

      await db.update('reportes', updateData, 'layout_num = ?', [layout_num]);
      return res.json({ ok: true, action: 'updated', layout_num });
    } else {
      // INSERT
      const insertData = {
        layout_num,
        layout_titulo,
        descripcion:     descripcion     || null,
        imagen_bytes:    imagenBuffer,
        imagen_mime:     imagen_mime     || (imagenBuffer ? 'image/jpeg' : null),
        imagen_nombre:   imagen_nombre   || null,
        usuario_id_usu:  usuario_id_usu  || null,
      };
      const result = await db.insert('reportes', insertData);
      return res.status(201).json({ ok: true, action: 'created', id_reporte: result.insertId, layout_num });
    }
  } catch (err) {
    console.error('POST /api/reportes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/reportes
 * Lista todos los reportes (sin imagen_bytes para no sobrecargar).
 */
app.get('/api/reportes', async (_req, res) => {
  try {
    const rows = await db.query(
      `SELECT id_reporte, layout_num, layout_titulo, descripcion,
              imagen_mime, imagen_nombre, fecha_crea, fecha_actualiza, usuario_id_usu
       FROM reportes ORDER BY layout_num`
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/reportes/:layout_num/imagen
 * Devuelve la imagen como binario con su Content-Type original.
 * Permite reconstruir la imagen desde los bytes almacenados.
 */
app.get('/api/reportes/:layout_num/imagen', async (req, res) => {
  try {
    const row = await db.queryOne(
      'SELECT imagen_bytes, imagen_mime, imagen_nombre FROM reportes WHERE layout_num = ?',
      [req.params.layout_num]
    );
    if (!row || !row.imagen_bytes) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }
    res.set('Content-Type', row.imagen_mime || 'image/jpeg');
    if (row.imagen_nombre) {
      res.set('Content-Disposition', `inline; filename="${row.imagen_nombre}"`);
    }
    res.send(row.imagen_bytes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ejemplo: listar registros de una tabla ───────────────────────────────────
// GET /api/:table?limit=50
app.get('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const rows = await db.query(`SELECT * FROM \`${table}\` LIMIT ?`, [limit]);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(`GET /api/${req.params.table} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Ejemplo: obtener un registro por ID ─────────────────────────────────────
// GET /api/:table/:id
app.get('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const row = await db.queryOne(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json({ data: row });
  } catch (err) {
    console.error(`GET /api/${req.params.table}/${req.params.id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Ejemplo: crear un registro ───────────────────────────────────────────────
// POST /api/:table  body: { campo: valor, ... }
app.post('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const result = await db.insert(table, req.body);
    console.log(`✅ Insertado en ${table}`);
    res.status(201).json(result);
  } catch (err) {
    console.error(`POST /api/${req.params.table} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Ejemplo: actualizar un registro ─────────────────────────────────────────
// PUT /api/:table/:id  body: { campo: nuevoValor, ... }
app.put('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const result = await db.update(table, req.body, 'id = ?', [id]);
    res.json(result);
  } catch (err) {
    console.error(`PUT /api/${req.params.table}/${req.params.id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Ejemplo: eliminar un registro ───────────────────────────────────────────
// DELETE /api/:table/:id
app.delete('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const result = await db.delete(table, 'id = ?', [id]);
    res.json(result);
  } catch (err) {
    console.error(`DELETE /api/${req.params.table}/${req.params.id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
testConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ No se pudo conectar a MySQL:', err.message);
    process.exit(1);
  });
