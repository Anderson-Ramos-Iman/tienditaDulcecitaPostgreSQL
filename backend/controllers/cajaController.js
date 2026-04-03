const cajaService = require('../services/cajaService');

class CajaController {
  async get(req, res, next) {
    try { res.json({ success: true, data: await cajaService.getCaja() }); }
    catch (err) { next(err); }
  }

  async getMovimientos(req, res, next) {
    try { res.json({ success: true, data: await cajaService.getMovimientos(req.query) }); }
    catch (err) { next(err); }
  }

  async apertura(req, res, next) {
    try { res.json({ success: true, data: await cajaService.apertura(req.body) }); }
    catch (err) { next(err); }
  }

  async cierre(req, res, next) {
    try { res.json({ success: true, data: await cajaService.cierre() }); }
    catch (err) { next(err); }
  }

  async movimientoManual(req, res, next) {
    try { res.json({ success: true, data: await cajaService.movimientoManual(req.body) }); }
    catch (err) { next(err); }
  }

  async ajustarSaldo(req, res, next) {
    try { res.json({ success: true, data: await cajaService.ajustarSaldo(req.body) }); }
    catch (err) { next(err); }
  }
}

module.exports = new CajaController();
