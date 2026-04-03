const authService = require('../services/authService');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
      const data = await authService.login(email, password);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async me(req, res) {
    res.json({ success: true, data: req.user });
  }
}

module.exports = new AuthController();
