const { query, transaction } = require('../db');

class CajaService {
  async getCaja() {
    const rows = await query('SELECT * FROM caja WHERE id = 1');
    return rows[0] || null;
  }

  async getMovimientos(filtros = {}) {
    const params = [];
    let sql = `SELECT m.* FROM movimientos_caja m WHERE 1=1`;

    if (filtros.fecha_inicio) { sql += ` AND m.fecha::date >= $${params.length+1}`; params.push(filtros.fecha_inicio); }
    if (filtros.fecha_fin)    { sql += ` AND m.fecha::date <= $${params.length+1}`; params.push(filtros.fecha_fin); }
    if (filtros.tipo)         { sql += ` AND m.tipo = $${params.length+1}`;          params.push(filtros.tipo); }
    if (filtros.origen)       { sql += ` AND m.origen = $${params.length+1}`;        params.push(filtros.origen); }

    sql += ' ORDER BY m.fecha DESC LIMIT 200';
    return query(sql, params);
  }

  async apertura(data) {
    const { monto_inicial_efectivo } = data;
    return transaction(async (conn) => {
      const caja = await conn.query('SELECT id FROM caja WHERE id = 1');
      if (!caja[0]) {
        await conn.query('INSERT INTO caja (id, saldo_efectivo, saldo_yape) VALUES (1, 0, 0)');
      }
      await conn.query('UPDATE caja SET saldo_efectivo = saldo_efectivo + $1 WHERE id = 1', [monto_inicial_efectivo]);
      await conn.query(
        `INSERT INTO movimientos_caja (tipo, origen, metodo, monto, descripcion, fecha)
         VALUES ('entrada', 'apertura', 'efectivo', $1, 'Apertura de caja', NOW())`,
        [monto_inicial_efectivo]
      );
      return { estado: 'abierta', monto_inicial_efectivo };
    });
  }

  async cierre() {
    const caja = await this.getCaja();
    if (!caja) throw new Error('No hay caja registrada');
    const rows = await query(`
      SELECT COALESCE(SUM(CASE WHEN tipo='entrada' THEN monto ELSE -monto END),0) AS total
      FROM movimientos_caja WHERE fecha::date = CURRENT_DATE`);
    return { estado: 'cerrada', saldo_efectivo: caja.saldo_efectivo, saldo_yape: caja.saldo_yape, movimientos_hoy: rows[0].total };
  }

  async movimientoManual(data) {
    const { tipo, origen, metodo, monto, descripcion } = data;
    if (!['entrada', 'salida'].includes(tipo)) throw new Error('Tipo inválido');

    return transaction(async (conn) => {
      const rows = await conn.query(
        `INSERT INTO movimientos_caja (tipo, origen, metodo, monto, descripcion, fecha)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [tipo, origen || 'manual', metodo, monto, descripcion]
      );
      if (metodo === 'efectivo') {
        const op = tipo === 'entrada' ? '+' : '-';
        await conn.query(`UPDATE caja SET saldo_efectivo = saldo_efectivo ${op} $1 WHERE id = 1`, [monto]);
      } else if (metodo === 'yape') {
        const op = tipo === 'entrada' ? '+' : '-';
        await conn.query(`UPDATE caja SET saldo_yape = saldo_yape ${op} $1 WHERE id = 1`, [monto]);
      }
      return { id: rows[0].id, tipo, metodo, monto };
    });
  }

  async ajustarSaldo(data) {
    const { nuevo_saldo_efectivo, nuevo_saldo_yape } = data;
    await query('UPDATE caja SET saldo_efectivo = $1, saldo_yape = $2 WHERE id = 1',
      [nuevo_saldo_efectivo, nuevo_saldo_yape]);
    return { saldo_efectivo: nuevo_saldo_efectivo, saldo_yape: nuevo_saldo_yape };
  }
}

module.exports = new CajaService();
