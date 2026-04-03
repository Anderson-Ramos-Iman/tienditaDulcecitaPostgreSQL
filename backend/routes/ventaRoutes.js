const router = require('express').Router();
const ctrl = require('../controllers/ventaController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',           authMiddleware(['admin']), ctrl.getAll);
router.get('/:id',        authMiddleware(['admin']), ctrl.getById);
router.post('/',          authMiddleware(['admin']), ctrl.create);
router.patch('/:id/anular', authMiddleware(['admin']), ctrl.anular);

module.exports = router;
