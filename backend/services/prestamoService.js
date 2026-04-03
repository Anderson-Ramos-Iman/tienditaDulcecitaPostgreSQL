const { query } = require('../db');

class PrestamoService {
  async getAll() {
    return query('SELECT * FROM prestamos ORDER BY fecha DESC');
  }

  async create(data) {
    const { descripcion, monto, fecha } = data;
    const rows = await query(
      `INSERT INTO prestamos (descripcion, monto, estado, fecha) VALUES ($1, $2, 'pendiente', $3) RETURNING id`,
      [descripcion, parseFloat(monto), fecha ? new Date(fecha) : new Date()]
    );
    return { id: rows[0].id, descripcion, monto, estado: 'pendiente' };
  }

  async marcarDevuelto(id) {
    await query(`UPDATE prestamos SET estado = 'devuelto', fecha_devolucion = NOW() WHERE id = $1`, [id]);
    return { id, estado: 'devuelto' };
  }

  async delete(id) {
    await query('DELETE FROM prestamos WHERE id = $1', [id]);
    return { id };
  }

  async getTotalPendiente() {
    const rows = await query(`SELECT COALESCE(SUM(monto),0) AS total FROM prestamos WHERE estado = 'pendiente'`);
    return parseFloat(rows[0].total);
  }
}

module.exports = new PrestamoService();
