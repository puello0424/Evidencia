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
import { testConnection } from './db.js';
import db from './db-query.js';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// ─── Verificación de salud ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    res.status(500).json({ error: err.message });
  }
});

// ─── Ejemplo: crear un registro ───────────────────────────────────────────────
// POST /api/:table  body: { campo: valor, ... }
app.post('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const result = await db.insert(table, req.body);
    res.status(201).json(result);
  } catch (err) {
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
