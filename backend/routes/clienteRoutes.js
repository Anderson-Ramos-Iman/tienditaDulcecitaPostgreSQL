const router = require('express').Router();
const ctrl = require('../controllers/clienteController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',              authMiddleware(['admin']), ctrl.getAll);
router.get('/:id',           authMiddleware(['admin']), ctrl.getById);
router.post('/',             authMiddleware(['admin']), ctrl.create);
router.put('/:id',           authMiddleware(['admin']), ctrl.update);
router.delete('/:id',        authMiddleware(['admin']), ctrl.delete);
router.get('/:id/deudas',    authMiddleware(['admin']), ctrl.getDeudas);

module.exports = router;
