const { query, transaction } = require('../db');

class CompraService {
  async getAll(filtros = {}) {
    const params = [];
    let sql = `
      SELECT c.*,
             (SELECT COALESCE(SUM(dc.cantidad * dc.precio_unitario),0)
              FROM detalle_compra dc WHERE dc.compra_id = c.id) AS subtotal
      FROM compras c WHERE 1=1`;

    if (filtros.fecha_inicio) { sql += ` AND c.fecha::date >= $${params.length+1}`; params.push(filtros.fecha_inicio); }
    if (filtros.fecha_fin)    { sql += ` AND c.fecha::date <= $${params.length+1}`; params.push(filtros.fecha_fin); }
    sql += ' ORDER BY c.fecha DESC';
    return query(sql, params);
  }

  async getById(id) {
    const rows = await query('SELECT * FROM compras WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const detalles = await query(`
      SELECT dc.*, p.nombre AS producto_nombre
      FROM detalle_compra dc JOIN productos p ON dc.producto_id = p.id
      WHERE dc.compra_id = $1`, [id]);
    return { ...rows[0], detalles };
  }

  async create(data) {
    const {
      productos, monto_efectivo = 0, monto_yape = 0,
      monto_externo = 0, monto_prestado = 0,
      prestado_descripcion = '', ajuste_redondeo = 0
    } = data;

    if (!productos || !productos.length) throw new Error('Se requieren productos');

    return transaction(async (conn) => {
      let subtotal = 0;
      for (const item of productos) {
        subtotal += item.cantidad * (item.es_bonificacion ? 0 : item.precio_unitario);
      }
      const total = subtotal - ajuste_redondeo;
      const totalPagado = parseFloat(monto_efectivo) + parseFloat(monto_yape) + parseFloat(monto_externo) + parseFloat(monto_prestado);
      if (Math.abs(totalPagado - total) > 0.01) throw new Error('El total pagado no coincide con el total de la compra');

      const cRows = await conn.query(
        `INSERT INTO compras (total, monto_efectivo, monto_yape, monto_externo, monto_prestado, ajuste_redondeo, fecha)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
        [total, monto_efectivo, monto_yape, monto_externo, monto_prestado, ajuste_redondeo]
      );
      const compraId = cRows[0].id;

      for (const item of productos) {
        const esBonif = item.es_bonificacion ? 1 : 0;
        await conn.query(
          `INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_unitario, es_bonificacion)
           VALUES ($1, $2, $3, $4, $5)`,
          [compraId, item.producto_id, item.cantidad, esBonif ? 0 : item.precio_unitario, esBonif]
        );
        await conn.query('UPDATE productos SET stock = stock + $1 WHERE id = $2', [item.cantidad, item.producto_id]);
        await conn.query(
          `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha)
           VALUES ($1, 'entrada', $2, $3, NOW())`,
          [item.producto_id, item.cantidad, esBonif ? 'Bonificación de compra' : 'Compra']
        );
      }

      if (monto_efectivo > 0) {
        await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('salida','compra','efectivo',$1,$2,NOW())`, [monto_efectivo, `Compra #${compraId}`]);
        await conn.query('UPDATE caja SET saldo_efectivo = saldo_efectivo - $1 WHERE id = 1', [monto_efectivo]);
      }
      if (monto_yape > 0) {
        await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('salida','compra','yape',$1,$2,NOW())`, [monto_yape, `Compra #${compraId}`]);
        await conn.query('UPDATE caja SET saldo_yape = saldo_yape - $1 WHERE id = 1', [monto_yape]);
      }
      if (monto_prestado > 0) {
        const desc = prestado_descripcion ? `${prestado_descripcion} (Compra #${compraId})` : `Compra #${compraId}`;
        await conn.query(
          `INSERT INTO prestamos (descripcion, monto, estado, fecha) VALUES ($1, $2, 'pendiente', NOW())`,
          [desc, monto_prestado]
        );
      }

      return { id: compraId, total, monto_efectivo, monto_yape, monto_externo, monto_prestado };
    });
  }

  async cancelar(id) {
    return transaction(async (conn) => {
      const compra = (await conn.query('SELECT * FROM compras WHERE id = $1', [id]))[0];
      if (!compra) throw new Error('Compra no encontrada');

      const detalles = await conn.query('SELECT * FROM detalle_compra WHERE compra_id = $1', [id]);
      for (const d of detalles) {
        await conn.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [d.cantidad, d.producto_id]);
        await conn.query(`INSERT INTO movimientos_stock (producto_id,tipo,cantidad,motivo,fecha) VALUES ($1,'salida',$2,'Cancelación de compra',NOW())`, [d.producto_id, d.cantidad]);
      }

      if (parseFloat(compra.monto_efectivo) > 0) {
        await conn.query('UPDATE caja SET saldo_efectivo = saldo_efectivo + $1 WHERE id = 1', [compra.monto_efectivo]);
        await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('entrada','devolucion','efectivo',$1,'Cancelación compra #${id}',NOW())`, [compra.monto_efectivo]);
      }
      if (parseFloat(compra.monto_yape) > 0) {
        await conn.query('UPDATE caja SET saldo_yape = saldo_yape + $1 WHERE id = 1', [compra.monto_yape]);
        await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('entrada','devolucion','yape',$1,'Cancelación compra #${id}',NOW())`, [compra.monto_yape]);
      }

      await conn.query('DELETE FROM detalle_compra WHERE compra_id = $1', [id]);
      await conn.query('DELETE FROM compras WHERE id = $1', [id]);
      return { id, cancelada: true };
    });
  }
}

module.exports = new CompraService();
