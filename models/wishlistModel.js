// Wishlist model: books a customer saved for later.
const { pool } = require('../config/db');

const findByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT b.id AS bookId, b.title, b.author, b.isbn, b.book_condition AS bookCondition,
            b.price, b.stock, b.cover_url AS coverUrl, w.added_at AS addedAt
     FROM wishlist_items w
     JOIN books b ON b.id = w.book_id
     WHERE w.user_id = ?
     ORDER BY w.added_at DESC`,
    [userId]
  );
  return rows;
};

// INSERT IGNORE: if the book is already in the wishlist nothing happens (no error)
const add = async (userId, bookId) => {
  await pool.execute('INSERT IGNORE INTO wishlist_items (user_id, book_id) VALUES (?, ?)', [userId, bookId]);
};

const remove = async (userId, bookId) => {
  const [result] = await pool.execute(
    'DELETE FROM wishlist_items WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );
  return result.affectedRows;
};

const exists = async (userId, bookId) => {
  const [rows] = await pool.execute(
    'SELECT id FROM wishlist_items WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );
  return rows.length > 0;
};

module.exports = { findByUser, add, remove, exists };
