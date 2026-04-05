const { query, transaction } = require('../db');

class CategoriaService {
  async getAll() {
    return query(`SELECT * FROM categorias ORDER BY nombre`);
  }

  async create(data) {
    const { nombre, icono = '🏷️' } = data;
    const rows = await query(
      `INSERT INTO categorias (nombre, icono) VALUES ($1, $2) RETURNING *`,
      [nombre, icono]
    );
    return rows[0];
  }

  async update(id, data) {
    const { nombre, icono } = data;
    const rows = await query(
      `UPDATE categorias SET nombre = $1, icono = $2 WHERE id = $3 RETURNING *`,
      [nombre, icono, id]
    );
    return rows[0] || null;
  }

  async delete(id) {
    await query(`DELETE FROM categorias WHERE id = $1`, [id]);
    return { id, eliminado: true };
  }

  async getByProducto(productoId) {
    return query(
      `SELECT c.* FROM categorias c
       JOIN producto_categorias pc ON pc.categoria_id = c.id
       WHERE pc.producto_id = $1 ORDER BY c.nombre`,
      [productoId]
    );
  }

  async setForProducto(productoId, categoriaIds) {
    return transaction(async (conn) => {
      await conn.query(`DELETE FROM producto_categorias WHERE producto_id = $1`, [productoId]);
      if (categoriaIds && categoriaIds.length > 0) {
        for (const cid of categoriaIds) {
          await conn.query(
            `INSERT INTO producto_categorias (producto_id, categoria_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [productoId, cid]
          );
        }
      }
      return this.getByProducto(productoId);
    });
  }
}

module.exports = new CategoriaService();
