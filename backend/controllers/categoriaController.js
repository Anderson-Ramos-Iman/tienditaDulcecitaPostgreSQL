const categoriaService = require('../services/categoriaService');

class CategoriaController {
  async getAll(req, res, next) {
    try {
      const data = await categoriaService.getAll();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const data = await categoriaService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const data = await categoriaService.update(req.params.id, req.body);
      if (!data) return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      const data = await categoriaService.delete(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getByProducto(req, res, next) {
    try {
      const data = await categoriaService.getByProducto(req.params.productoId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

module.exports = new CategoriaController();
