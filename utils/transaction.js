// Runs some database work inside a transaction.
// If anything throws, every change is rolled back, so the database is never
// left half-updated (for example stock taken but no order created).
const { pool } = require('../config/db');

const withTransaction = async (work) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release(); // give the connection back to the pool
  }
};

module.exports = { withTransaction };
