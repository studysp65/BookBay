// MySQL connection pool.
// A pool keeps a few connections open and reuses them, which is faster than
// opening a new connection for every request.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bookbay',
  waitForConnections: true,
  connectionLimit: 10,
  // Return DECIMAL columns (prices) as JavaScript numbers instead of strings
  decimalNumbers: true,
  // Cloud MySQL providers (Aiven, Railway, AWS RDS...) need an encrypted connection
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

module.exports = { pool };
