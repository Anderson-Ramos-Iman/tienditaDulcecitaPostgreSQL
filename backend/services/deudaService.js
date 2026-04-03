const { query, transaction } = require('../db');

class DeudaService {
  async getAll(filtros = {}) {
    const params = [];
    let sql = `
      SELECT d.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
             COALESCE((SELECT SUM(p.monto_total) FROM pagos_deuda p WHERE p.deuda_id = d.id), 0) AS total_pagado
      FROM deudas d JOIN clientes c ON d.cliente_id = c.id WHERE 1=1`;

    if (filtros.estado)     { sql += ` AND d.estado = $${params.length+1}`;     params.push(filtros.estado); }
    if (filtros.cliente_id) { sql += ` AND d.cliente_id = $${params.length+1}`; params.push(filtros.cliente_id); }
    sql += ' ORDER BY d.id DESC';
    return query(sql, params);
  }

  async getById(id) {
    const rows = await query(`
      SELECT d.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
      FROM deudas d JOIN clientes c ON d.cliente_id = c.id WHERE d.id = $1`, [id]);
    if (!rows[0]) return null;
    const pagos = await query('SELECT * FROM pagos_deuda WHERE deuda_id = $1 ORDER BY fecha DESC', [id]);
    const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto_total || 0), 0);
    return { ...rows[0], pagos, total_pagado: totalPagado, saldo_restante: parseFloat(rows[0].total_pendiente) - totalPagado };
  }

  async getByCliente(clienteId) {
    return query(`
      SELECT d.*,
             v.fecha AS venta_fecha,
             COALESCE((SELECT SUM(p.monto_total) FROM pagos_deuda p WHERE p.deuda_id = d.id), 0) AS total_pagado,
             COALESCE((SELECT COUNT(*) FROM detalle_venta dv WHERE dv.venta_id = d.venta_id), 0) AS num_productos
      FROM deudas d
      LEFT JOIN ventas v ON v.id = d.venta_id
      WHERE d.cliente_id = $1 ORDER BY d.id DESC`, [clienteId]);
  }

  async getResumenPorCliente() {
    return query(`
      SELECT
        c.id   AS cliente_id,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono,
        COUNT(d.id) AS total_deudas,
        COALESCE(SUM(d.total_pendiente), 0) AS deuda_total,
        COALESCE(SUM(
          COALESCE((SELECT SUM(p.monto_total) FROM pagos_deuda p WHERE p.deuda_id = d.id), 0)
        ), 0) AS total_pagado,
        COUNT(CASE WHEN d.estado = 'pendiente' THEN 1 END) AS deudas_pendientes
      FROM clientes c
      LEFT JOIN deudas d ON d.cliente_id = c.id
      GROUP BY c.id, c.nombre, c.telefono
      ORDER BY COUNT(CASE WHEN d.estado = 'pendiente' THEN 1 END) DESC, c.nombre ASC`);
  }

  async registrarPago(data) {
    const { deuda_id, monto_efectivo = 0, monto_yape = 0 } = data;
    const totalPago = parseFloat(monto_efectivo) + parseFloat(monto_yape);
    if (totalPago <= 0) throw new Error('El monto del pago debe ser mayor a 0');

    return transaction(async (conn) => {
      const deuda = (await conn.query('SELECT * FROM deudas WHERE id = $1', [deuda_id]))[0];
      if (!deuda) throw new Error('Deuda no encontrada');
      if (deuda.estado === 'pagada') throw new Error('La deuda ya está pagada');

      const pagos = await conn.query('SELECT COALESCE(SUM(monto_total),0) AS total FROM pagos_deuda WHERE deuda_id = $1', [deuda_id]);
      const totalPagadoAntes = parseFloat(pagos[0].total);
      const saldo = parseFloat(deuda.total_pendiente) - totalPagadoAntes;
      if (totalPago > saldo + 0.01) throw new Error(`El pago excede el saldo pendiente (${saldo.toFixed(2)})`);

      const pRows = await conn.query(
        `INSERT INTO pagos_deuda (deuda_id, monto_total, monto_efectivo, monto_yape, fecha)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [deuda_id, totalPago, monto_efectivo, monto_yape]
      );

      const nuevoTotal = totalPagadoAntes + totalPago;
      const nuevoSaldo = parseFloat(deuda.total_pendiente) - nuevoTotal;
      const nuevoEstado = nuevoSaldo <= 0.01 ? 'pagada' : 'pendiente';
      await conn.query('UPDATE deudas SET estado = $1 WHERE id = $2', [nuevoEstado, deuda_id]);

      if (parseFloat(monto_efectivo) > 0) {
        await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('entrada','pago_deuda','efectivo',$1,'Pago deuda #${deuda_id}',NOW())`, [monto_efectivo]);
        await conn.query('UPDATE caja SET saldo_efectivo = saldo_efectivo + $1 WHERE id = 1', [monto_efectivo]);
      }
      if (parseFloat(monto_yape) > 0) {
        await conn.query(`INSERT INTO movimientos_caja (tipo,origen,metodo,monto,descripcion,fecha) VALUES ('entrada','pago_deuda','yape',$1,'Pago deuda #${deuda_id}',NOW())`, [monto_yape]);
        await conn.query('UPDATE caja SET saldo_yape = saldo_yape + $1 WHERE id = 1', [monto_yape]);
      }

      return { pago_id: pRows[0].id, deuda_id, monto_pagado: totalPago, saldo_restante: nuevoSaldo, estado: nuevoEstado };
    });
  }
}

module.exports = new DeudaService();
