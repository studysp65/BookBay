// Cart model: the books a customer is about to buy.
const { pool } = require('../config/db');

// conn is optional: checkout passes its transaction connection
const findByUser = async (userId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT b.id AS bookId, b.title, b.author, b.isbn, b.book_condition AS bookCondition,
            b.price, b.stock, b.cover_url AS coverUrl, c.quantity
     FROM cart_items c
     JOIN books b ON b.id = c.book_id
     WHERE c.user_id = ?
     ORDER BY c.added_at ASC`,
    [userId]
  );
  return rows;
};

const findItem = async (userId, bookId) => {
  const [rows] = await pool.execute(
    'SELECT quantity FROM cart_items WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );
  return rows[0] || null;
};

// Adds a new row, or adds to the quantity if the book is already in the cart
const addOrIncrease = async (userId, bookId, quantity) => {
  await pool.execute(
    `INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
    [userId, bookId, quantity, quantity]
  );
};

const setQuantity = async (userId, bookId, quantity) => {
  const [result] = await pool.execute(
    'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND book_id = ?',
    [quantity, userId, bookId]
  );
  return result.affectedRows;
};

const remove = async (userId, bookId) => {
  const [result] = await pool.execute(
    'DELETE FROM cart_items WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );
  return result.affectedRows;
};

const clear = async (userId, conn = pool) => {
  await conn.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
};

const countItems = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT COALESCE(SUM(quantity), 0) AS count FROM cart_items WHERE user_id = ?',
    [userId]
  );
  return Number(rows[0].count);
};

module.exports = { findByUser, findItem, addOrIncrease, setQuantity, remove, clear, countItems };
