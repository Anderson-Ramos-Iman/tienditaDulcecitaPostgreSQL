const deudaService = require('../services/deudaService');

class DeudaController {
  async getAll(req, res, next) {
    try { res.json({ success: true, data: await deudaService.getAll(req.query) }); }
    catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await deudaService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Deuda no encontrada' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getByCliente(req, res, next) {
    try { res.json({ success: true, data: await deudaService.getByCliente(req.params.clienteId) }); }
    catch (err) { next(err); }
  }

  async registrarPago(req, res, next) {
    try { res.json({ success: true, data: await deudaService.registrarPago({ deuda_id: req.params.id, ...req.body }) }); }
    catch (err) { next(err); }
  }
}

module.exports = new DeudaController();
