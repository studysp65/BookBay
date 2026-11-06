// Book model: every SQL query that touches the books table.
const { pool } = require('../config/db');

// Column names are aliased to camelCase so the JSON sent to the browser is consistent
const BOOK_FIELDS = `id, title, author, genre, isbn, description,
  book_condition AS bookCondition, condition_note AS conditionNote,
  price, stock, cover_url AS coverUrl, created_at AS createdAt`;

// Only these ORDER BY options are allowed (column names can't be "?" placeholders,
// so we pick from a fixed list instead of using what the user typed)
const SORT_OPTIONS = {
  newest: 'created_at DESC, id DESC',
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id DESC',
  title: 'title ASC, id ASC',
};

// Escapes % and _ so they are searched for literally inside LIKE
const likePattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

// filters: { q, genre, author, condition, minPrice, maxPrice, sort, page, limit }
const search = async (filters) => {
  const where = [];
  const params = [];

  if (filters.q) {
    where.push('(title LIKE ? OR author LIKE ?)');
    params.push(likePattern(filters.q), likePattern(filters.q));
  }
  if (filters.genre) {
    where.push('genre = ?');
    params.push(filters.genre);
  }
  if (filters.author) {
    where.push('author = ?');
    params.push(filters.author);
  }
  if (filters.condition === 'new') {
    where.push("book_condition = 'New'");
  } else if (filters.condition === 'used') {
    where.push("book_condition <> 'New'");
  } else if (filters.condition) {
    where.push('book_condition = ?'); // a specific grade such as "Good"
    params.push(filters.condition);
  }
  if (filters.minPrice !== undefined) {
    where.push('price >= ?');
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    where.push('price <= ?');
    params.push(filters.maxPrice);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORT_OPTIONS[filters.sort] || SORT_OPTIONS.newest;
  const limit = filters.limit;
  const offset = (filters.page - 1) * filters.limit;

  // pool.query (not execute) is used here because MySQL prepared statements
  // don't accept LIMIT/OFFSET placeholders reliably. pool.query still escapes
  // every "?" value, so this is just as safe against SQL injection.
  const [books] = await pool.query(
    `SELECT ${BOOK_FIELDS} FROM books ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM books ${whereSql}`, params);

  return { books, total: countRows[0].total };
};

const findById = async (id) => {
  const [rows] = await pool.execute(`SELECT ${BOOK_FIELDS} FROM books WHERE id = ?`, [id]);
  return rows[0] || null;
};

// Other listings of the same book (e.g. the new copy and the used copies)
const findOtherCopies = async (book) => {
  const [rows] = await pool.execute(
    `SELECT ${BOOK_FIELDS} FROM books WHERE title = ? AND author = ? AND id <> ? ORDER BY price ASC`,
    [book.title, book.author, book.id]
  );
  return rows;
};

// Used for the "recently viewed" list. ids come from our own cookie.
const findByIds = async (ids) => {
  if (ids.length === 0) return [];
  const [rows] = await pool.query(`SELECT ${BOOK_FIELDS} FROM books WHERE id IN (?)`, [ids]);
  return rows;
};

const getFilterOptions = async () => {
  const [genres] = await pool.execute('SELECT DISTINCT genre FROM books ORDER BY genre');
  const [authors] = await pool.execute('SELECT DISTINCT author FROM books ORDER BY author');
  return {
    genres: genres.map((row) => row.genre),
    authors: authors.map((row) => row.author),
  };
};

const create = async (book) => {
  const [result] = await pool.execute(
    `INSERT INTO books (title, author, genre, isbn, description, book_condition, condition_note, price, stock, cover_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [book.title, book.author, book.genre, book.isbn, book.description,
      book.bookCondition, book.conditionNote, book.price, book.stock, book.coverUrl]
  );
  return result.insertId;
};

const update = async (id, book) => {
  const [result] = await pool.execute(
    `UPDATE books SET title = ?, author = ?, genre = ?, isbn = ?, description = ?,
       book_condition = ?, condition_note = ?, price = ?, stock = ?, cover_url = ?
     WHERE id = ?`,
    [book.title, book.author, book.genre, book.isbn, book.description,
      book.bookCondition, book.conditionNote, book.price, book.stock, book.coverUrl, id]
  );
  return result.affectedRows;
};

const updateStock = async (id, stock) => {
  const [result] = await pool.execute('UPDATE books SET stock = ? WHERE id = ?', [stock, id]);
  return result.affectedRows;
};

const remove = async (id) => {
  const [result] = await pool.execute('DELETE FROM books WHERE id = ?', [id]);
  return result.affectedRows;
};

// ----- Used inside checkout / cancel transactions (conn = a transaction connection) -----

// FOR UPDATE locks these rows until the transaction ends, so two customers
// can't buy the last copy at the same time.
const lockForUpdate = async (conn, ids) => {
  const [rows] = await conn.query(
    'SELECT id, title, price, stock, book_condition AS bookCondition FROM books WHERE id IN (?) FOR UPDATE',
    [ids]
  );
  return rows;
};

const decreaseStock = async (conn, id, quantity) => {
  // "AND stock >= ?" is an extra safety net: stock can never go below zero
  const [result] = await conn.execute(
    'UPDATE books SET stock = stock - ? WHERE id = ? AND stock >= ?',
    [quantity, id, quantity]
  );
  return result.affectedRows === 1;
};

const increaseStock = async (conn, id, quantity) => {
  await conn.execute('UPDATE books SET stock = stock + ? WHERE id = ?', [quantity, id]);
};

module.exports = {
  search,
  findById,
  findOtherCopies,
  findByIds,
  getFilterOptions,
  create,
  update,
  updateStock,
  remove,
  lockForUpdate,
  decreaseStock,
  increaseStock,
};
