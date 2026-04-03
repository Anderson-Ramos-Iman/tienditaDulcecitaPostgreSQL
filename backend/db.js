const { Pool } = require('pg');
const config = require('./config/config');

const pool = new Pool(config.db);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    throw error;
  }
};

// Returns rows[] directly (like mysql2 behaviour)
const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

// Wraps a pg transaction; callback receives conn.query() that also returns rows[]
const transaction = async (callback) => {
  const client = await pool.connect();
  const conn = {
    query: async (sql, params = []) => {
      const result = await client.query(sql, params);
      return result.rows;
    }
  };
  try {
    await client.query('BEGIN');
    const result = await callback(conn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { connectDB, pool, query, transaction };
