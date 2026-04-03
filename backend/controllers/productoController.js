const productoService = require('../services/productoService');

class ProductoController {
  async getAll(req, res, next) {
    try {
      const data = req.query.q
        ? await productoService.buscar(req.query.q)
        : await productoService.getAll();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await productoService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const data = await productoService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const data = await productoService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      const data = await productoService.delete(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getPromociones(req, res, next) {
    try {
      const data = await productoService.getPromociones(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async createPromocion(req, res, next) {
    try {
      const data = await productoService.createPromocion({ producto_id: req.params.id, ...req.body });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
}

module.exports = new ProductoController();
