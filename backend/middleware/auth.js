const jwt = require('jsonwebtoken');
const config = require('../config/config');

const authMiddleware = (rolesPermitidos = []) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }
    try {
      const user = jwt.verify(token, config.jwt.secret);
      if (rolesPermitidos.length && !rolesPermitidos.includes(user.rol)) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
  };
};

module.exports = { authMiddleware };
