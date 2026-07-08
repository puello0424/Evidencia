/**
 * test-db.js — Prueba los módulos db.js y db-query.js contra el Docker MySQL
 * Ejecutar: node server/test-db.js
 */

import { testConnection } from './db.js';
import db from './db-query.js';

async function run() {
  console.log('\n=== TEST DB MODULES ===\n');

  // 1. Conexión
  await testConnection();

  // 2. query() — listar usuarios
  console.log('\n[1] SELECT usuarios:');
  const users = await db.query('SELECT id_usu, nombre, correo, estado FROM usuario');
  console.table(users);

  // 3. queryOne() — un empleado por id
  console.log('[2] queryOne() empleado id=1:');
  const emp = await db.queryOne('SELECT * FROM empleados WHERE id_emple = ?', [1]);
  console.log(emp);

  // 4. insert() — nuevo departamento
  console.log('\n[3] insert() nuevo departamento:');
  const ins = await db.insert('departamento', {
    nombre: 'Marketing',
    descripcion: 'Departamento de mercadeo'
  });
  console.log('insertId:', ins.insertId, '| affectedRows:', ins.affectedRows);

  // 5. update() — cambiar descripción del dpto recién creado
  console.log('\n[4] update() descripción departamento:');
  const upd = await db.update(
    'departamento',
    { descripcion: 'Marketing digital y estrategia de marca' },
    'id_departamento = ?',
    [ins.insertId]
  );
  console.log('affectedRows:', upd.affectedRows, '| changedRows:', upd.changedRows);

  // 6. delete() — borrar el dpto de prueba
  console.log('\n[5] delete() departamento de prueba:');
  const del = await db.delete('departamento', 'id_departamento = ?', [ins.insertId]);
  console.log('affectedRows:', del.affectedRows);

  // 7. transaction() — INSERT empleado + asignación en una sola tx
  console.log('\n[6] transaction() — nuevo empleado + asignación:');
  await db.transaction(async (conn) => {
    const [empRes] = await conn.execute(
      `INSERT INTO empleados (nombre, apellido, cedula, carga, fecha_ingre, salario, estado, usuario_id_usu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Luis', 'Prueba', '99999999', 'Tester', '2025-01-01', 2000000, 'activo', 1]
    );
    const newEmpId = empRes.insertId;
    await conn.execute(
      `INSERT INTO asignaciones (fecha_ini, fecha_fin, departamento_id_departamento, empleados_id_emple)
       VALUES (?, ?, ?, ?)`,
      ['2025-01-01', '2025-12-31', 1, newEmpId]
    );
    console.log('  → empleado insertado id:', newEmpId);
  });

  // 8. Verificar todo lo que quedó en asignaciones
  console.log('\n[7] SELECT asignaciones JOIN empleados:');
  const asig = await db.query(`
    SELECT a.id_asignacion, e.nombre, e.apellido, d.nombre AS departamento, a.fecha_ini, a.fecha_fin
    FROM asignaciones a
    JOIN empleados e ON e.id_emple = a.empleados_id_emple
    JOIN departamento d ON d.id_departamento = a.departamento_id_departamento
  `);
  console.table(asig);

  console.log('\n✅ Todos los tests pasaron correctamente.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Error en test:', err.message);
  process.exit(1);
});
