const { query } = require('../db');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

class ClienteService {
  async getAll() {
    return query(`
      SELECT c.*, u.nombre AS usuario_nombre, u.email AS usuario_email
      FROM clientes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.nombre
    `);
  }

  async getById(id) {
    const rows = await query(`
      SELECT c.*, u.nombre AS usuario_nombre, u.email AS usuario_email
      FROM clientes c LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.id = $1`, [id]);
    return rows[0] || null;
  }

  async create(data) {
    const { nombre, telefono, tiene_cuenta = false } = data;
    const rows = await query(
      `INSERT INTO clientes (nombre, telefono, tiene_cuenta) VALUES ($1, $2, $3) RETURNING id`,
      [nombre, telefono, tiene_cuenta ? 1 : 0]
    );
    return { id: rows[0].id, nombre, telefono, tiene_cuenta };
  }

  async update(id, data) {
    const { nombre, telefono, tiene_cuenta } = data;
    await query(
      `UPDATE clientes SET nombre = $1, telefono = $2, tiene_cuenta = $3 WHERE id = $4`,
      [nombre, telefono, tiene_cuenta ? 1 : 0, id]
    );
    return { id, ...data };
  }

  async delete(id) {
    await query('DELETE FROM clientes WHERE id = $1', [id]);
    return { id, eliminado: true };
  }

  async buscar(termino) {
    const t = `%${termino}%`;
    return query(`
      SELECT c.*, u.nombre AS usuario_nombre FROM clientes c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.nombre ILIKE $1 OR c.telefono ILIKE $1
      ORDER BY c.nombre LIMIT 20`, [t]);
  }

  async getDeudas(clienteId) {
    return query(`
      SELECT d.*, COALESCE(SUM(p.monto_total), 0) AS total_pagado
      FROM deudas d
      LEFT JOIN pagos_deuda p ON d.id = p.deuda_id
      WHERE d.cliente_id = $1
      GROUP BY d.id
      ORDER BY d.id DESC`, [clienteId]);
  }
}

module.exports = new ClienteService();
