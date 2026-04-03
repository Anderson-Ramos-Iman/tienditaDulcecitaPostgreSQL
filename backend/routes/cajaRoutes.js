const router = require('express').Router();
const ctrl = require('../controllers/cajaController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',              authMiddleware(['admin']), ctrl.get);
router.get('/movimientos',   authMiddleware(['admin']), ctrl.getMovimientos);
router.post('/apertura',     authMiddleware(['admin']), ctrl.apertura);
router.post('/cierre',       authMiddleware(['admin']), ctrl.cierre);
router.post('/movimiento',   authMiddleware(['admin']), ctrl.movimientoManual);
router.post('/ajuste',       authMiddleware(['admin']), ctrl.ajustarSaldo);

module.exports = router;
