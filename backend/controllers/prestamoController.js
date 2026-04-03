const prestamoService = require('../services/prestamoService');

class PrestamoController {
  async getAll(req, res, next) {
    try { res.json({ success: true, data: await prestamoService.getAll() }); }
    catch (err) { next(err); }
  }

  async create(req, res, next) {
    try { res.status(201).json({ success: true, data: await prestamoService.create(req.body) }); }
    catch (err) { next(err); }
  }

  async devolver(req, res, next) {
    try { res.json({ success: true, data: await prestamoService.marcarDevuelto(req.params.id) }); }
    catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try { res.json({ success: true, data: await prestamoService.delete(req.params.id) }); }
    catch (err) { next(err); }
  }
}

module.exports = new PrestamoController();
