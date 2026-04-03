const compraService = require('../services/compraService');

class CompraController {
  async getAll(req, res, next) {
    try { res.json({ success: true, data: await compraService.getAll(req.query) }); }
    catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await compraService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Compra no encontrada' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      if (!req.body.productos?.length) return res.status(400).json({ success: false, message: 'Se requieren productos' });
      const data = await compraService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async cancelar(req, res, next) {
    try { res.json({ success: true, data: await compraService.cancelar(req.params.id) }); }
    catch (err) { next(err); }
  }
}

module.exports = new CompraController();
