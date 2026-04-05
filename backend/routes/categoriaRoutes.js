const express    = require('express');
const ctrl       = require('../controllers/categoriaController');
const { authMiddleware } = require('../middleware/auth');
const router     = express.Router();

router.get('/',    ctrl.getAll);
router.post('/',   authMiddleware(), ctrl.create);
router.put('/:id', authMiddleware(), ctrl.update);
router.delete('/:id', authMiddleware(), ctrl.delete);

module.exports = router;
