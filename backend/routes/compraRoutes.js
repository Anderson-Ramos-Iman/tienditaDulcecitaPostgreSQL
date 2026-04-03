const router = require('express').Router();
const ctrl = require('../controllers/compraController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',               authMiddleware(['admin']), ctrl.getAll);
router.get('/:id',            authMiddleware(['admin']), ctrl.getById);
router.post('/',              authMiddleware(['admin']), ctrl.create);
router.post('/:id/cancelar',  authMiddleware(['admin']), ctrl.cancelar);

module.exports = router;
