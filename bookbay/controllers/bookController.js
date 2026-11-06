// Book controller: browsing for everyone, and create / edit / delete for the admin.
const { matchedData } = require('express-validator');
const bookModel = require('../models/bookModel');
const { securityLog } = require('../utils/logger');
const AppError = require('../utils/AppError');

// "Recently viewed" cookie: remembers the last 6 books this browser opened.
// It only holds book ids (nothing sensitive) and is HttpOnly like our other cookies.
const RECENT_COOKIE = 'bb_recent';
const RECENT_MAX = 6;

const recentCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.USE_HTTPS === 'true',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
});

const readRecentIds = (req) => {
  const raw = req.cookies[RECENT_COOKIE] || '';
  return raw
    .split('-')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, RECENT_MAX);
};

// Turns the form/JSON body into the shape the model expects
const bookFromBody = (data) => ({
  title: data.title,
  author: data.author,
  genre: data.genre,
  isbn: data.isbn || null,
  description: data.description || null,
  bookCondition: data.bookCondition,
  // A new book has no condition note
  conditionNote: data.bookCondition === 'New' ? null : data.conditionNote || null,
  price: data.price,
  stock: data.stock,
  coverUrl: data.coverUrl || null,
});

// GET /api/v1/books?q=&genre=&author=&condition=&minPrice=&maxPrice=&sort=&page=&limit=
const listBooks = async (req, res) => {
  const data = matchedData(req, { locations: ['query'] });
  const filters = {
    q: data.q || '',
    genre: data.genre || '',
    author: data.author || '',
    condition: data.condition || '',
    minPrice: data.minPrice,
    maxPrice: data.maxPrice,
    sort: data.sort || 'newest',
    page: data.page || 1,
    limit: data.limit || 12,
  };

  const { books, total } = await bookModel.search(filters);

  res.status(200).json({
    status: 'success',
    results: books.length,
    data: {
      books,
      total,
      page: filters.page,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  });
};

// GET /api/v1/books/filters  (lists for the genre and author dropdowns)
const getFilterOptions = async (req, res) => {
  const options = await bookModel.getFilterOptions();
  res.status(200).json({ status: 'success', data: options });
};

// GET /api/v1/books/recent
const getRecentlyViewed = async (req, res) => {
  const ids = readRecentIds(req);
  const books = await bookModel.findByIds(ids);
  // Keep the cookie's order (most recent first)
  books.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  res.status(200).json({ status: 'success', data: { books } });
};

// GET /api/v1/books/:id
const getBook = async (req, res) => {
  const { id } = matchedData(req);
  const book = await bookModel.findById(id);
  if (!book) {
    throw new AppError(404, 'Book not found.');
  }

  const otherCopies = await bookModel.findOtherCopies(book);

  // Put this book at the front of the recently viewed list
  const recentIds = [id, ...readRecentIds(req).filter((recentId) => recentId !== id)].slice(0, RECENT_MAX);
  res.cookie(RECENT_COOKIE, recentIds.join('-'), recentCookieOptions());

  res.status(200).json({ status: 'success', data: { book, otherCopies } });
};

// POST /api/v1/books  (admin)
const createBook = async (req, res) => {
  const book = bookFromBody(matchedData(req));
  const id = await bookModel.create(book);
  const created = await bookModel.findById(id);

  securityLog('book_created', { adminId: req.user.id, bookId: id });
  res.status(201).json({ status: 'success', message: 'Book added', data: { book: created } });
};

// PUT /api/v1/books/:id  (admin)
const updateBook = async (req, res) => {
  const data = matchedData(req);
  const changed = await bookModel.update(data.id, bookFromBody(data));
  if (!changed) {
    throw new AppError(404, 'Book not found.');
  }
  const updated = await bookModel.findById(data.id);

  securityLog('book_updated', { adminId: req.user.id, bookId: data.id });
  res.status(200).json({ status: 'success', message: 'Book updated', data: { book: updated } });
};

// PATCH /api/v1/books/:id/stock  (admin)
const updateStock = async (req, res) => {
  const { id, stock } = matchedData(req);
  const changed = await bookModel.updateStock(id, stock);
  if (!changed) {
    throw new AppError(404, 'Book not found.');
  }
  const updated = await bookModel.findById(id);

  securityLog('stock_updated', { adminId: req.user.id, bookId: id, stock });
  res.status(200).json({ status: 'success', message: 'Stock updated', data: { book: updated } });
};

// DELETE /api/v1/books/:id  (admin)
const deleteBook = async (req, res) => {
  const { id } = matchedData(req);
  const deleted = await bookModel.remove(id);
  if (!deleted) {
    throw new AppError(404, 'Book not found.');
  }

  securityLog('book_deleted', { adminId: req.user.id, bookId: id });
  res.status(200).json({ status: 'success', message: 'Book deleted' });
};

module.exports = {
  listBooks,
  getFilterOptions,
  getRecentlyViewed,
  getBook,
  createBook,
  updateBook,
  updateStock,
  deleteBook,
};
