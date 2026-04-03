const router = require('express').Router();
const ctrl = require('../controllers/pedidoController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',              authMiddleware(['admin']), ctrl.getAll);
router.get('/:id',           authMiddleware(['admin']), ctrl.getById);
router.post('/',             authMiddleware(['admin']), ctrl.create);
router.patch('/:id/estado',  authMiddleware(['admin']), ctrl.updateEstado);
router.delete('/:id',        authMiddleware(['admin']), ctrl.delete);

module.exports = router;
