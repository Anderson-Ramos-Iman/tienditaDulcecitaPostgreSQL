const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./db');

const authRoutes     = require('./routes/authRoutes');
const productoRoutes = require('./routes/productoRoutes');
const clienteRoutes  = require('./routes/clienteRoutes');
const ventaRoutes    = require('./routes/ventaRoutes');
const deudaRoutes    = require('./routes/deudaRoutes');
const cajaRoutes     = require('./routes/cajaRoutes');
const compraRoutes   = require('./routes/compraRoutes');
const prestamoRoutes = require('./routes/prestamoRoutes');
const pedidoRoutes   = require('./routes/pedidoRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',      authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/clientes',  clienteRoutes);
app.use('/api/ventas',    ventaRoutes);
app.use('/api/deudas',    deudaRoutes);
app.use('/api/caja',      cajaRoutes);
app.use('/api/compras',   compraRoutes);
app.use('/api/prestamos', prestamoRoutes);
app.use('/api/pedidos',   pedidoRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.get('/',         (_req, res) => res.sendFile(path.join(__dirname, '../frontend/home.html')));
app.get('/home',     (_req, res) => res.sendFile(path.join(__dirname, '../frontend/home.html')));
app.get('/login',    (_req, res) => res.sendFile(path.join(__dirname, '../frontend/login.html')));
app.get('/admin',    (_req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

app.use(express.static(path.join(__dirname, '../frontend')));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Error interno del servidor' });
});

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`📁 API en http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Error iniciando servidor:', err.message);
    process.exit(1);
  }
};

start();
module.exports = app;
