const { query, transaction } = require('../db');

class PedidoService {
  async getAll(filtros = {}) {
    const params = [];
    let sql = `
      SELECT p.*, c.nombre AS cliente_nombre
      FROM pedidos p JOIN clientes c ON p.cliente_id = c.id WHERE 1=1`;
    if (filtros.estado) { sql += ` AND p.estado = $${params.length+1}`; params.push(filtros.estado); }
    sql += ' ORDER BY p.fecha DESC';
    return query(sql, params);
  }

  async getById(id) {
    const rows = await query(`
      SELECT p.*, c.nombre AS cliente_nombre
      FROM pedidos p JOIN clientes c ON p.cliente_id = c.id WHERE p.id = $1`, [id]);
    if (!rows[0]) return null;
    const detalles = await query(`
      SELECT dp.*, pr.nombre AS producto_nombre
      FROM detalle_pedido dp JOIN productos pr ON dp.producto_id = pr.id
      WHERE dp.pedido_id = $1`, [id]);
    return { ...rows[0], detalles };
  }

  async create(data) {
    const { cliente_id, productos, notas = '' } = data;
    return transaction(async (conn) => {
      let total = 0;
      for (const item of productos) total += item.cantidad * (item.precio_unitario || 0);

      const pRows = await conn.query(
        `INSERT INTO pedidos (cliente_id, estado, total, notas, fecha) VALUES ($1, 'pendiente', $2, $3, NOW()) RETURNING id`,
        [cliente_id, total, notas]
      );
      const pedidoId = pRows[0].id;

      for (const item of productos) {
        await conn.query(
          `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
          [pedidoId, item.producto_id, item.cantidad, item.precio_unitario || 0]
        );
      }
      return { id: pedidoId, total, estado: 'pendiente' };
    });
  }

  async updateEstado(id, estado) {
    await query(
      `UPDATE pedidos SET estado = $1, fecha_actualizado = NOW() WHERE id = $2`,
      [estado, id]
    );
    return { id, estado };
  }

  async delete(id) {
    await query('DELETE FROM detalle_pedido WHERE pedido_id = $1', [id]);
    await query('DELETE FROM pedidos WHERE id = $1', [id]);
    return { id };
  }
}

module.exports = new PedidoService();
