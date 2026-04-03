const { query, transaction } = require('../db');

class ProductoService {
  async getAll() {
    return query(`SELECT * FROM productos WHERE activo = 1 OR activo IS NULL ORDER BY nombre`);
  }

  async getById(id) {
    const rows = await query('SELECT * FROM productos WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async create(data) {
    const { nombre, precio_base, stock = 0, tipo_venta = 'unidad', imagen_url = null } = data;
    const rows = await query(
      `INSERT INTO productos (nombre, precio_base, stock, tipo_venta, imagen_url, activo)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING id`,
      [nombre, precio_base, stock, tipo_venta, imagen_url]
    );
    return { id: rows[0].id, ...data };
  }

  async update(id, data) {
    const { nombre, precio_base, tipo_venta, imagen_url = null } = data;
    await query(
      `UPDATE productos SET nombre = $1, precio_base = $2, tipo_venta = $3, imagen_url = $4 WHERE id = $5`,
      [nombre, precio_base, tipo_venta, imagen_url, id]
    );
    return { id, ...data };
  }

  async delete(id) {
    await query('UPDATE productos SET activo = 0 WHERE id = $1', [id]);
    return { id, eliminado: true };
  }

  async buscar(termino) {
    const t = `%${termino}%`;
    return query(
      `SELECT * FROM productos WHERE nombre ILIKE $1 AND (activo = 1 OR activo IS NULL) ORDER BY nombre LIMIT 20`,
      [t]
    );
  }

  async getPromociones(productoId) {
    return query('SELECT * FROM promociones WHERE producto_id = $1 AND activa = 1', [productoId]);
  }

  async createPromocion(data) {
    const { producto_id, cantidad_minima, precio_promocional } = data;
    const rows = await query(
      `INSERT INTO promociones (producto_id, cantidad_minima, precio_promocional, activa)
       VALUES ($1, $2, $3, 1) RETURNING id`,
      [producto_id, cantidad_minima, precio_promocional]
    );
    return { id: rows[0].id, ...data };
  }

  async updateStock(id, cantidad, tipo = 'entrada', motivo = '', conn = null) {
    const ejecutar = async (c) => {
      const sql = tipo === 'entrada'
        ? 'UPDATE productos SET stock = stock + $1 WHERE id = $2'
        : 'UPDATE productos SET stock = stock - $1 WHERE id = $2';
      await c.query(sql, [Math.abs(cantidad), id]);
      await c.query(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, tipo, cantidad, motivo]
      );
      const rows = await c.query('SELECT stock FROM productos WHERE id = $1', [id]);
      return rows[0];
    };
    if (conn) return ejecutar(conn);
    return transaction(ejecutar);
  }
}

module.exports = new ProductoService();
