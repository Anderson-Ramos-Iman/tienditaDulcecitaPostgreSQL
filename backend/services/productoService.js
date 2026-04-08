const { query, transaction } = require('../db');
const categoriaService = require('./categoriaService');

class ProductoService {
  async getAll() {
    const rows = await query(`
      SELECT p.*,
        COALESCE(
          json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'icono', c.icono))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categorias
      FROM productos p
      LEFT JOIN producto_categorias pc ON pc.producto_id = p.id
      LEFT JOIN categorias c ON c.id = pc.categoria_id
      WHERE p.activo = 1 OR p.activo IS NULL
      GROUP BY p.id
      ORDER BY p.nombre`);
    return rows;
  }

  async getAllForCompras() {
    return query(`SELECT * FROM productos ORDER BY nombre`);
  }

  async getById(id) {
    const rows = await query(`
      SELECT p.*,
        COALESCE(
          json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'icono', c.icono))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categorias
      FROM productos p
      LEFT JOIN producto_categorias pc ON pc.producto_id = p.id
      LEFT JOIN categorias c ON c.id = pc.categoria_id
      WHERE p.id = $1
      GROUP BY p.id`, [id]);
    return rows[0] || null;
  }

  async create(data) {
    const { nombre, precio_base, stock = 0, tipo_venta = 'unidad', imagen_url = null, categorias = [] } = data;
    const rows = await query(
      `INSERT INTO productos (nombre, precio_base, stock, tipo_venta, imagen_url, activo)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING id`,
      [nombre, precio_base, stock, tipo_venta, imagen_url]
    );
    const id = rows[0].id;
    if (categorias.length > 0) await categoriaService.setForProducto(id, categorias);
    return this.getById(id);
  }

  async update(id, data) {
    const { nombre, precio_base, tipo_venta, imagen_url = null, categorias, stock } = data;
    const fields = ['nombre=$1', 'precio_base=$2', 'tipo_venta=$3', 'imagen_url=$4'];
    const params = [nombre, precio_base, tipo_venta, imagen_url];
    if (stock !== undefined && stock !== null) {
      fields.push(`stock=$${params.length + 1}`);
      params.push(stock);
    }
    params.push(id);
    await query(
      `UPDATE productos SET ${fields.join(', ')} WHERE id=$${params.length}`,
      params
    );
    if (Array.isArray(categorias)) await categoriaService.setForProducto(id, categorias);
    return this.getById(id);
  }

  async delete(id) {
    await query('UPDATE productos SET activo = 0 WHERE id = $1', [id]);
    return { id, eliminado: true };
  }

  async buscar(termino) {
    const t = `%${termino}%`;
    return query(
      `SELECT p.*,
        COALESCE(
          json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'icono', c.icono))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categorias
       FROM productos p
       LEFT JOIN producto_categorias pc ON pc.producto_id = p.id
       LEFT JOIN categorias c ON c.id = pc.categoria_id
       WHERE p.nombre ILIKE $1 AND (p.activo = 1 OR p.activo IS NULL)
       GROUP BY p.id
       ORDER BY p.nombre
       LIMIT 50`,
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
