// Order model: orders, the books in each order and the status history.
const { pool } = require('../config/db');

const ORDER_FIELDS = `o.id, o.user_id AS userId, o.status, o.total,
  o.delivery_address AS deliveryAddress, o.payment_status AS paymentStatus,
  o.payment_ref AS paymentRef, o.card_last4 AS cardLast4,
  o.created_at AS createdAt, o.updated_at AS updatedAt`;

// ----- Reading -----

const findById = async (id, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT ${ORDER_FIELDS}, u.name AS customerName, u.email AS customerEmail
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const findItems = async (orderId, conn = pool) => {
  const [rows] = await conn.execute(
    `SELECT id, book_id AS bookId, title, book_condition AS bookCondition,
            unit_price AS unitPrice, quantity
     FROM order_items WHERE order_id = ? ORDER BY id`,
    [orderId]
  );
  return rows;
};

const findHistory = async (orderId) => {
  const [rows] = await pool.execute(
    `SELECT status, note, changed_at AS changedAt
     FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC, id ASC`,
    [orderId]
  );
  return rows;
};

const findByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ${ORDER_FIELDS},
       (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS itemCount
     FROM orders o
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC, o.id DESC`,
    [userId]
  );
  return rows;
};

// For the admin. status is optional (filter by one status).
const findAll = async (status) => {
  const params = [];
  let whereSql = '';
  if (status) {
    whereSql = 'WHERE o.status = ?';
    params.push(status);
  }
  const [rows] = await pool.execute(
    `SELECT ${ORDER_FIELDS}, u.name AS customerName, u.email AS customerEmail,
       (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = o.id) AS itemCount
     FROM orders o JOIN users u ON u.id = o.user_id
     ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC`,
    params
  );
  return rows;
};

// ----- Writing (all used inside transactions, so they take conn) -----

const create = async (conn, { userId, total, deliveryAddress }) => {
  const [result] = await conn.execute(
    'INSERT INTO orders (user_id, total, delivery_address) VALUES (?, ?, ?)',
    [userId, total, deliveryAddress]
  );
  return result.insertId;
};

const addItem = async (conn, orderId, item) => {
  await conn.execute(
    `INSERT INTO order_items (order_id, book_id, title, book_condition, unit_price, quantity)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [orderId, item.bookId, item.title, item.bookCondition, item.price, item.quantity]
  );
};

const addHistory = async (conn, orderId, status, changedBy, note) => {
  await conn.execute(
    'INSERT INTO order_status_history (order_id, status, changed_by, note) VALUES (?, ?, ?, ?)',
    [orderId, status, changedBy, note || null]
  );
};

// Locks the order row until the transaction ends
const lockById = async (conn, id) => {
  const [rows] = await conn.execute(
    'SELECT id, user_id AS userId, status, payment_status AS paymentStatus FROM orders WHERE id = ? FOR UPDATE',
    [id]
  );
  return rows[0] || null;
};

const findPendingIdsByUser = async (conn, userId) => {
  const [rows] = await conn.execute(
    "SELECT id FROM orders WHERE user_id = ? AND status = 'pending' FOR UPDATE",
    [userId]
  );
  return rows.map((row) => row.id);
};

const updateStatus = async (conn, id, status) => {
  await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
};

const updatePayment = async (conn, id, { paymentStatus, paymentRef, cardLast4 }) => {
  await conn.execute(
    'UPDATE orders SET payment_status = ?, payment_ref = ?, card_last4 = ? WHERE id = ?',
    [paymentStatus, paymentRef, cardLast4, id]
  );
};

const updatePaymentStatus = async (conn, id, paymentStatus) => {
  await conn.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [paymentStatus, id]);
};

module.exports = {
  findById,
  findItems,
  findHistory,
  findByUser,
  findAll,
  create,
  addItem,
  addHistory,
  lockById,
  findPendingIdsByUser,
  updateStatus,
  updatePayment,
  updatePaymentStatus,
};
