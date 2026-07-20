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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { testConnection } from './db.js';
import db from './db-query.js';

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET   = process.env.JWT_SECRET   || 'evidencia_dev_secret';
const JWT_EXPIRES  = process.env.JWT_EXPIRES_IN || '8h';

// ─── Middleware de autenticación JWT ─────────────────────────────────────────
// Úsalo en rutas que requieran usuario logueado:
//   app.get('/api/recurso-privado', authMiddleware, async (req, res) => { ... })
export function authMiddleware(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Permitir peticiones desde el frontend Vite (cualquier origen en dev)
app.use(cors());
// Imágenes en base64 pueden ser grandes — subir límite a 20mb
app.use(express.json({ limit: '20mb' }));

// ─── Verificación de salud ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Busca el usuario en la tabla `usuarios` (campos: email, password, nombre, id_usu).
 * Soporta passwords en texto plano y hasheadas con bcrypt.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario por correo (tabla: usuario, columnas: correo, contrasena, nombre, id_usu)
    const user = await db.queryOne(
      `SELECT * FROM usuario WHERE correo = ? LIMIT 1`,
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar password — soporta bcrypt y texto plano
    let valid = false;
    if (user.contrasena && user.contrasena.startsWith('$2')) {
      // Hash bcrypt
      valid = await bcrypt.compare(password, user.contrasena);
    } else {
      // Texto plano (legacy)
      valid = user.contrasena === password;
    }

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const payload = {
      id:     user.id_usu,
      email:  user.correo,
      nombre: user.nombre,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Devolver token + datos básicos del usuario (sin contrasena)
    const { contrasena: _pw, ...userSafe } = user;
    res.json({ ok: true, token, user: userSafe });
  } catch (err) {
    console.error('POST /api/auth/login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Valida el token JWT y devuelve los datos del usuario activo.
 * Header: Authorization: Bearer <token>
 */
app.get('/api/auth/me', (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ ok: true, user: payload });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

/**
 * POST /api/auth/logout
 * El logout en JWT es stateless — el cliente descarta el token.
 * Este endpoint existe para tener un punto de entrada consistente.
 */
app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true });
});



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

// ─── REPORTES ─────────────────────────────────────────────────────────────────
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
