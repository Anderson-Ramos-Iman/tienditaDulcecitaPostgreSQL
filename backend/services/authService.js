const { query } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

class AuthService {
  async getUserByEmail(email) {
    const rows = await query('SELECT * FROM usuarios WHERE email = $1 LIMIT 1', [email]);
    return rows[0] || null;
  }

  generateToken(payload) {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  }

  verifyToken(token) {
    return jwt.verify(token, config.jwt.secret);
  }

  async login(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user) throw new Error('Usuario o contraseña inválidos');

    const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
    const valid = isHashed
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!valid) throw new Error('Usuario o contraseña inválidos');
    if (user.rol !== 'admin') throw new Error('Acceso solo para administradores');

    const payload = { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
    const token = this.generateToken(payload);

    return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, token };
  }
}

module.exports = new AuthService();
