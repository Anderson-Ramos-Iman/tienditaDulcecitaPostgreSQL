const pedidoService = require('../services/pedidoService');

class PedidoController {
  async getAll(req, res, next) {
    try { res.json({ success: true, data: await pedidoService.getAll(req.query) }); }
    catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await pedidoService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try { res.status(201).json({ success: true, data: await pedidoService.create(req.body) }); }
    catch (err) { next(err); }
  }

  async updateEstado(req, res, next) {
    try { res.json({ success: true, data: await pedidoService.updateEstado(req.params.id, req.body.estado) }); }
    catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try { res.json({ success: true, data: await pedidoService.delete(req.params.id) }); }
    catch (err) { next(err); }
  }
}

module.exports = new PedidoController();
