const ventaService = require('../services/ventaService');

class VentaController {
  async getAll(req, res, next) {
    try { res.json({ success: true, data: await ventaService.getAll(req.query) }); }
    catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await ventaService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Venta no encontrada' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const { productos, tipo_pago } = req.body;
      if (!productos?.length) return res.status(400).json({ success: false, message: 'Se requiere al menos un producto' });
      if (!tipo_pago) return res.status(400).json({ success: false, message: 'Tipo de pago requerido' });
      const validos = ['efectivo', 'yape', 'deuda', 'mixto', 'cortesia'];
      if (!validos.includes(tipo_pago)) return res.status(400).json({ success: false, message: 'Tipo de pago no válido' });
      if (tipo_pago === 'deuda' && !req.body.cliente_id) return res.status(400).json({ success: false, message: 'Cliente requerido para ventas a deuda' });
      const data = await ventaService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async anular(req, res, next) {
    try { res.json({ success: true, data: await ventaService.anular(req.params.id) }); }
    catch (err) { next(err); }
  }
}

module.exports = new VentaController();
