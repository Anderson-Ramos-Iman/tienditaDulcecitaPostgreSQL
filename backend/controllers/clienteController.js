const clienteService = require('../services/clienteService');

class ClienteController {
  async getAll(req, res, next) {
    try {
      const data = req.query.q
        ? await clienteService.buscar(req.query.q)
        : await clienteService.getAll();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await clienteService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const data = await clienteService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const data = await clienteService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      const data = await clienteService.delete(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getDeudas(req, res, next) {
    try {
      const data = await clienteService.getDeudas(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

module.exports = new ClienteController();
