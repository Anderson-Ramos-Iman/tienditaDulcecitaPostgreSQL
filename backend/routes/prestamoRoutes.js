const router = require('express').Router();
const ctrl = require('../controllers/prestamoController');
const { authMiddleware } = require('../middleware/auth');

router.get('/',              authMiddleware(['admin']), ctrl.getAll);
router.post('/',             authMiddleware(['admin']), ctrl.create);
router.patch('/:id/devolver',authMiddleware(['admin']), ctrl.devolver);
router.delete('/:id',        authMiddleware(['admin']), ctrl.delete);

module.exports = router;
