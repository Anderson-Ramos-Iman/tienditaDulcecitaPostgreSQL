const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.get('/me', authMiddleware(['admin']), ctrl.me);

module.exports = router;
