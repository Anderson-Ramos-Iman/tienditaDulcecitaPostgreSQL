const { query, transaction } = require('../db');

class VentaService {
  async getAll(filtros = {}) {
    const params = [];
    let sql = `
      SELECT v.*, c.nombre AS cliente_nombre,
             d.total_pendiente AS deuda_total,
             COALESCE((SELECT SUM(p.monto_total) FROM pagos_deuda p WHERE p.deuda_id = d.id),0) AS deuda_pagado,
             d.estado AS deuda_estado
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN deudas d ON d.venta_id = v.id
      WHERE 1=1`;

    if (filtros.fecha_inicio) { sql += ` AND v.fecha::date >= $${params.length+1}`; params.push(filtros.fecha_inicio); }
    if (filtros.fecha_fin)    { sql += ` AND v.fecha::date <= $${params.length+1}`; params.push(filtros.fecha_fin); }
    if (filtros.tipo_pago)    { sql += ` AND v.tipo_pago = $${params.length+1}`;    params.push(filtros.tipo_pago); }
    if (filtros.cliente_id)   { sql += ` AND v.cliente_id = $${params.length+1}`;   params.push(filtros.cliente_id); }
    if (!filtros.incluir_anuladas) sql += ` AND (v.estado IS NULL OR v.estado != 'anulada')`;
    sql += ' ORDER BY v.fecha DESC';
    return query(sql, params);
  }

  async getById(id) {
    const rows = await query(`
      SELECT v.*, c.nombre AS cliente_nombre
      FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = $1`, [id]);
    if (!rows[0]) return null;
    const detalles = await query(`
      SELECT dv.*, p.nombre AS producto_nombre
      FROM detalle_venta dv JOIN productos p ON dv.producto_id = p.id
      WHERE dv.venta_id = $1`, [id]);
    return { ...rows[0], detalles };
  }

  async _getPromociones(productoId) {
    return query('SELECT * FROM promociones WHERE producto_id = $1 AND activa = 1', [productoId]);
  }

  async _aplicarPromociones(productos) {
    const result = [];
    for (const item of productos) {
      const promos = await this._getPromociones(item.producto_id);
      let precioFinal = item.precio_unitario;
      let esBonif = false;
      for (const promo of promos) {
        if (item.cantidad >= promo.cantidad_minima) {
          precioFinal = parseFloat(promo.precio_promocional);
          esBonif = item.cantidad % promo.cantidad_minima !== 0;
        }
      }
      result.push({ ...item, precio_unitario_final: precioFinal, subtotal: item.cantidad * precioFinal, es_bonificacion: esBonif });
    }
    return result;
  }

  async create(data) {
    const { cliente_id, tipo_pago, productos } = data;
    return transaction(async (conn) => {
      const productosProc = await this._aplicarPromociones(productos);

      for (const item of productosProc) {
        const prod = await conn.query('SELECT stock FROM productos WHERE id = $1', [item.producto_id]);
        if (!prod[0]) throw new Error(`Producto ${item.producto_id} no encontrado`);
        if (!item.es_bonificacion && prod[0].stock < item.cantidad) {
          throw new Error(`Stock insuficiente para el producto (disponible: ${prod[0].stock})`);
        }
      }

      let total = productosProc.reduce((s, i) => s + i.subtotal, 0);
      const redondeo = parseFloat(data.redondeo) || 0;
      total = parseFloat((total + redondeo).toFixed(2));

      const montoEfectivo = tipo_pago === 'efectivo' ? total : (parseFloat(data.monto_efectivo) || 0);
      const montoYape     = tipo_pago === 'yape'     ? total : (parseFloat(data.monto_yape)     || 0);

      const vRows = await conn.query(
        `INSERT INTO ventas (cliente_id, tipo_pago, total, monto_efectivo, monto_yape, fecha)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [cliente_id || null, tipo_pago, total, montoEfectivo, montoYape]
      );
      const ventaId = vRows[0].id;

      for (const item of productosProc) {
        await conn.query(
          `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, es_bonificacion)
           VALUES ($1, $2, $3, $4, $5)`,
          [ventaId, item.producto_id, item.cantidad, item.precio_unitario_final, item.es_bonificacion ? 1 : 0]
        );
        await conn.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.producto_id]);
        await conn.query(
          `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha)
           VALUES ($1, 'salida', $2, 'Venta', NOW())`, [item.producto_id, item.cantidad]);
      }

      if (tipo_pago !== 'deuda' && tipo_pago !== 'cortesia') {
        if (tipo_pago === 'efectivo' || tipo_pago === 'mixto') {
          const me = tipo_pago === 'efectivo' ? total : (parseFloat(data.monto_efectivo) || 0);
          if (me > 0) {
            await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('entrada','venta','efectivo',$1,$2,NOW())`, [me, `Venta #${ventaId}`]);
            await conn.query('UPDATE caja SET saldo_efectivo = saldo_efectivo + $1 WHERE id = 1', [me]);
          }
        }
        if (tipo_pago === 'yape' || tipo_pago === 'mixto') {
          const my = tipo_pago === 'yape' ? total : (parseFloat(data.monto_yape) || 0);
          if (my > 0) {
            await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('entrada','venta','yape',$1,$2,NOW())`, [my, `Venta #${ventaId}`]);
            await conn.query('UPDATE caja SET saldo_yape = saldo_yape + $1 WHERE id = 1', [my]);
          }
        }
      }

      if (tipo_pago === 'deuda' && cliente_id) {
        await conn.query(
          `INSERT INTO deudas (cliente_id, venta_id, total_pendiente, estado) VALUES ($1, $2, $3, 'pendiente')`,
          [cliente_id, ventaId, total]
        );
      }

      return { id: ventaId, total, tipo_pago, productos: productosProc };
    });
  }

  async anular(id) {
    return transaction(async (conn) => {
      const venta = (await conn.query('SELECT * FROM ventas WHERE id = $1', [id]))[0];
      if (!venta) throw new Error('Venta no encontrada');
      if (venta.estado === 'anulada') throw new Error('La venta ya está anulada');

      const detalles = await conn.query('SELECT * FROM detalle_venta WHERE venta_id = $1', [id]);
      for (const d of detalles) {
        await conn.query('UPDATE productos SET stock = stock + $1 WHERE id = $2', [d.cantidad, d.producto_id]);
        await conn.query(`INSERT INTO movimientos_stock (producto_id,tipo,cantidad,motivo,fecha) VALUES ($1,'entrada',$2,'Anulación venta #${id}',NOW())`, [d.producto_id, d.cantidad]);
      }

      if (venta.tipo_pago !== 'cortesia') {
        if (venta.tipo_pago === 'efectivo' || venta.tipo_pago === 'mixto') {
          const m = venta.tipo_pago === 'efectivo' ? parseFloat(venta.total) : parseFloat(venta.monto_efectivo || 0);
          if (m > 0) {
            await conn.query('UPDATE caja SET saldo_efectivo = saldo_efectivo - $1 WHERE id = 1', [m]);
            await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('salida','devolucion','efectivo',$1,'Anulación venta #${id}',NOW())`, [m]);
          }
        }
        if (venta.tipo_pago === 'yape' || venta.tipo_pago === 'mixto') {
          const m = venta.tipo_pago === 'yape' ? parseFloat(venta.total) : parseFloat(venta.monto_yape || 0);
          if (m > 0) {
            await conn.query('UPDATE caja SET saldo_yape = saldo_yape - $1 WHERE id = 1', [m]);
            await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('salida','devolucion','yape',$1,'Anulación venta #${id}',NOW())`, [m]);
          }
        }
      }

      if (venta.tipo_pago === 'deuda') {
        await conn.query(`UPDATE deudas SET estado = 'anulada' WHERE venta_id = $1`, [id]);
      }

      await conn.query(`UPDATE ventas SET estado = 'anulada' WHERE id = $1`, [id]);
      return { id, anulada: true };
    });
  }
}

module.exports = new VentaService();
