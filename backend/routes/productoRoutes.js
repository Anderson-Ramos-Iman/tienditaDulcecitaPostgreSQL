const router = require('express').Router();
const ctrl = require('../controllers/productoController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',                ctrl.getAll);
router.get('/:id',             ctrl.getById);
router.post('/',               authMiddleware(['admin']), ctrl.create);
router.put('/:id',             authMiddleware(['admin']), ctrl.update);
router.delete('/:id',          authMiddleware(['admin']), ctrl.delete);
router.get('/:id/promociones', authMiddleware(['admin']), ctrl.getPromociones);
router.post('/:id/promociones',authMiddleware(['admin']), ctrl.createPromocion);

module.exports = router;
