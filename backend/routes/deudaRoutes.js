const router = require('express').Router();
const ctrl = require('../controllers/deudaController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',                        authMiddleware(['admin']), ctrl.getAll);
router.get('/cliente/:clienteId',      authMiddleware(['admin']), ctrl.getByCliente);
router.get('/:id',                     authMiddleware(['admin']), ctrl.getById);
router.post('/:id/pagar',              authMiddleware(['admin']), ctrl.registrarPago);

module.exports = router;
