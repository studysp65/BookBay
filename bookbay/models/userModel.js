// User model: every SQL query that touches the users table.
// All queries use "?" placeholders (prepared statements), so user input
// is never pasted into the SQL text. This prevents SQL injection.
const { pool } = require('../config/db');

// Columns that are safe to send to the browser (no password hash)
const SAFE_FIELDS = 'id, name, email, role, address, created_at AS createdAt';

const createUser = async ({ name, email, passwordHash }) => {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, 'user'] // new accounts are never admins
  );
  return result.insertId;
};

// Includes password_hash: only used to check a password, never sent to the browser
const findByEmailWithPassword = async (email) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
};

const findByIdWithPassword = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await pool.execute(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`, [id]);
  return rows[0] || null;
};

const updateDetails = async (id, { name, email, address }) => {
  await pool.execute(
    'UPDATE users SET name = ?, email = ?, address = ? WHERE id = ?',
    [name, email, address, id]
  );
};

const updatePassword = async (id, passwordHash) => {
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
};

module.exports = {
  createUser,
  findByEmailWithPassword,
  findByIdWithPassword,
  findById,
  updateDetails,
  updatePassword,
};
