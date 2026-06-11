const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isNeon = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require'));

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Enable SSL in production or for Neon DB (which requires SSL)
    ssl: (isProduction || isNeon) ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    min: parseInt(process.env.DB_POOL_MIN || '2'),
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || 'sistem_jadwal',
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    min: parseInt(process.env.DB_POOL_MIN || '2'),
  });
}

// Log connection verification on non-serverless startup
if (!process.env.VERCEL) {
  pool.query('SELECT NOW()')
    .then(res => {
      console.log(`[Database] Pool connected successfully. Server time: ${res.rows[0].now}`);
    })
    .catch(err => {
      console.error('[Database] Failed to connect to connection pool:', err.message);
    });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
