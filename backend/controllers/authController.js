const authService = require('../services/authService');
const bcrypt = require('bcrypt');
const { query } = require('../db');

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

  async verifyPassword(req, res, next) {
    try {
      const { password } = req.body;
      if (!password) return res.status(400).json({ success: false, message: 'Contraseña requerida' });
      const rows = await query('SELECT password FROM usuarios WHERE id = $1', [req.user.id]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      const hash = rows[0].password;
      const isHashed = hash.startsWith('$2b$') || hash.startsWith('$2a$');
      const valid = isHashed ? await bcrypt.compare(password, hash) : hash === password;
      if (!valid) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}

module.exports = new AuthController();
