-- ============================================================
-- Schema PostgreSQL – Tiendita Dulcecita
-- Compatible con Render PostgreSQL / Supabase / Neon
-- ============================================================

-- Eliminar tablas en orden inverso de dependencias
DROP TABLE IF EXISTS pagos_deuda CASCADE;
DROP TABLE IF EXISTS detalle_pedido CASCADE;
DROP TABLE IF EXISTS detalle_venta CASCADE;
DROP TABLE IF EXISTS detalle_compra CASCADE;
DROP TABLE IF EXISTS movimientos_stock CASCADE;
DROP TABLE IF EXISTS movimientos_caja CASCADE;
DROP TABLE IF EXISTS deudas CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS prestamos CASCADE;
DROP TABLE IF EXISTS promociones CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS caja CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ------------------------------------------------------------
-- usuarios
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id       SERIAL PRIMARY KEY,
  nombre   VARCHAR(100),
  email    VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol      VARCHAR(20)
);

-- ------------------------------------------------------------
-- productos
-- ------------------------------------------------------------
CREATE TABLE productos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100),
  precio_base NUMERIC(10,2),
  stock       INT,
  tipo_venta  VARCHAR(20),
  activo      SMALLINT DEFAULT 1,
  imagen_url  VARCHAR(500)
);

-- ------------------------------------------------------------
-- clientes  (→ usuarios)
-- ------------------------------------------------------------
CREATE TABLE clientes (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(100),
  telefono     VARCHAR(20),
  tiene_cuenta SMALLINT DEFAULT 0,
  usuario_id   INT REFERENCES usuarios(id)
);

-- ------------------------------------------------------------
-- caja
-- ------------------------------------------------------------
CREATE TABLE caja (
  id              SERIAL PRIMARY KEY,
  saldo_efectivo  NUMERIC(10,2) DEFAULT 0.00,
  saldo_yape      NUMERIC(10,2) DEFAULT 0.00
);

-- ------------------------------------------------------------
-- compras
-- ------------------------------------------------------------
CREATE TABLE compras (
  id               SERIAL PRIMARY KEY,
  total            NUMERIC(10,2),
  monto_efectivo   NUMERIC(10,2),
  monto_yape       NUMERIC(10,2),
  monto_externo    NUMERIC(10,2),
  ajuste_redondeo  NUMERIC(10,2),
  monto_prestado   NUMERIC(10,2) DEFAULT 0.00,
  fecha            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- prestamos
-- ------------------------------------------------------------
CREATE TABLE prestamos (
  id               SERIAL PRIMARY KEY,
  descripcion      VARCHAR(255) NOT NULL,
  monto            NUMERIC(10,2) NOT NULL,
  estado           VARCHAR(20) DEFAULT 'pendiente',
  fecha            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_devolucion TIMESTAMP
);

-- ------------------------------------------------------------
-- ventas  (→ clientes)
-- ------------------------------------------------------------
CREATE TABLE ventas (
  id              SERIAL PRIMARY KEY,
  cliente_id      INT REFERENCES clientes(id),
  tipo_pago       VARCHAR(20),
  total           NUMERIC(10,2),
  monto_efectivo  NUMERIC(10,2) DEFAULT 0.00,
  monto_yape      NUMERIC(10,2) DEFAULT 0.00,
  estado          VARCHAR(20),
  fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- deudas  (→ clientes, ventas)
-- ------------------------------------------------------------
CREATE TABLE deudas (
  id               SERIAL PRIMARY KEY,
  cliente_id       INT REFERENCES clientes(id),
  total_pendiente  NUMERIC(10,2),
  estado           VARCHAR(20) DEFAULT 'pendiente',
  venta_id         INT REFERENCES ventas(id)
);

-- ------------------------------------------------------------
-- pedidos  (→ clientes)
-- ------------------------------------------------------------
CREATE TABLE pedidos (
  id                SERIAL PRIMARY KEY,
  cliente_id        INT NOT NULL REFERENCES clientes(id),
  estado            VARCHAR(30) DEFAULT 'pendiente',
  total             NUMERIC(10,2) DEFAULT 0.00,
  notas             TEXT,
  fecha             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizado TIMESTAMP
);

-- ------------------------------------------------------------
-- detalle_compra  (→ compras, productos)
-- ------------------------------------------------------------
CREATE TABLE detalle_compra (
  id               SERIAL PRIMARY KEY,
  compra_id        INT REFERENCES compras(id),
  producto_id      INT REFERENCES productos(id),
  cantidad         INT,
  precio_unitario  NUMERIC(10,2),
  es_bonificacion  SMALLINT DEFAULT 0
);

-- ------------------------------------------------------------
-- detalle_venta  (→ ventas, productos)
-- ------------------------------------------------------------
CREATE TABLE detalle_venta (
  id               SERIAL PRIMARY KEY,
  venta_id         INT REFERENCES ventas(id),
  producto_id      INT REFERENCES productos(id),
  cantidad         INT,
  precio_unitario  NUMERIC(10,2),
  es_bonificacion  SMALLINT DEFAULT 0
);

-- ------------------------------------------------------------
-- detalle_pedido  (→ pedidos, productos)
-- ------------------------------------------------------------
CREATE TABLE detalle_pedido (
  id               SERIAL PRIMARY KEY,
  pedido_id        INT NOT NULL REFERENCES pedidos(id),
  producto_id      INT NOT NULL REFERENCES productos(id),
  cantidad         INT NOT NULL,
  precio_unitario  NUMERIC(10,2) DEFAULT 0.00
);

-- ------------------------------------------------------------
-- pagos_deuda  (→ deudas)
-- ------------------------------------------------------------
CREATE TABLE pagos_deuda (
  id              SERIAL PRIMARY KEY,
  deuda_id        INT REFERENCES deudas(id),
  monto_total     NUMERIC(10,2),
  monto_efectivo  NUMERIC(10,2) DEFAULT 0.00,
  monto_yape      NUMERIC(10,2) DEFAULT 0.00,
  fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- movimientos_stock  (→ productos)
-- ------------------------------------------------------------
CREATE TABLE movimientos_stock (
  id          SERIAL PRIMARY KEY,
  producto_id INT REFERENCES productos(id),
  tipo        VARCHAR(20),
  cantidad    INT,
  motivo      VARCHAR(50),
  fecha       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- movimientos_caja
-- ------------------------------------------------------------
CREATE TABLE movimientos_caja (
  id          SERIAL PRIMARY KEY,
  tipo        VARCHAR(20),
  origen      VARCHAR(20),
  metodo      VARCHAR(20),
  monto       NUMERIC(10,2),
  descripcion TEXT,
  fecha       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- promociones  (→ productos)
-- ------------------------------------------------------------
CREATE TABLE promociones (
  id                 SERIAL PRIMARY KEY,
  producto_id        INT REFERENCES productos(id),
  cantidad_minima    INT,
  precio_promocional NUMERIC(10,2),
  activa             SMALLINT DEFAULT 1
);

-- ============================================================
-- Datos iniciales obligatorios
-- ============================================================

-- Fila de caja (el backend siempre usa id = 1)
INSERT INTO caja (id, saldo_efectivo, saldo_yape) VALUES (1, 0.00, 0.00);

-- Reiniciar secuencia de caja para que el siguiente AUTO sea 2
SELECT setval('caja_id_seq', 1);

-- Usuario administrador  contraseña: Admin081125
INSERT INTO usuarios (nombre, email, password, rol)
VALUES ('Administrador', 'admin@tiendita.com',
        '$2b$10$sbizNAld4SC/9lKUoB.DNuPTusShHCKbItfaHGi/UbrN.oASKlMy6', 'admin');
