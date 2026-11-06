// Cart controller: add, change and remove books in the cart.
// The total is always worked out on the server from database prices.
const { matchedData } = require('express-validator');
const cartModel = require('../models/cartModel');
const bookModel = require('../models/bookModel');
const { calculateLineTotal, calculateTotal, findStockProblems } = require('../utils/cart');
const AppError = require('../utils/AppError');

const MAX_PER_BOOK = 20;

// GET /api/v1/cart
const getCart = async (req, res) => {
  const items = await cartModel.findByUser(req.user.id);

  const itemsWithTotals = items.map((item) => ({
    ...item,
    lineTotal: calculateLineTotal(item.price, item.quantity),
  }));

  res.status(200).json({
    status: 'success',
    data: {
      items: itemsWithTotals,
      total: calculateTotal(items),
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      // Warn the customer if stock dropped after they added a book
      problems: findStockProblems(items),
    },
  });
};

// GET /api/v1/cart/count  (for the badge in the header)
const getCartCount = async (req, res) => {
  const count = await cartModel.countItems(req.user.id);
  res.status(200).json({ status: 'success', data: { count } });
};

// POST /api/v1/cart  { bookId, quantity }
const addToCart = async (req, res) => {
  const { bookId, quantity = 1 } = matchedData(req);
  const userId = req.user.id;

  const book = await bookModel.findById(bookId);
  if (!book) {
    throw new AppError(404, 'Book not found.');
  }
  if (book.stock <= 0) {
    throw new AppError(409, 'Sorry, this book is out of stock.');
  }

  const existing = await cartModel.findItem(userId, bookId);
  const newQuantity = (existing ? existing.quantity : 0) + quantity;

  if (newQuantity > book.stock) {
    throw new AppError(409, `Only ${book.stock} ${book.stock === 1 ? 'copy' : 'copies'} available.`);
  }
  if (newQuantity > MAX_PER_BOOK) {
    throw new AppError(400, `You can buy at most ${MAX_PER_BOOK} copies of one book.`);
  }

  await cartModel.addOrIncrease(userId, bookId, quantity);
  res.status(201).json({ status: 'success', message: `"${book.title}" added to your cart.` });
};

// PATCH /api/v1/cart/:bookId  { quantity }
const updateQuantity = async (req, res) => {
  const { bookId, quantity } = matchedData(req);

  const book = await bookModel.findById(bookId);
  if (!book) {
    throw new AppError(404, 'Book not found.');
  }
  if (quantity > book.stock) {
    throw new AppError(409, `Only ${book.stock} ${book.stock === 1 ? 'copy' : 'copies'} available.`);
  }

  const changed = await cartModel.setQuantity(req.user.id, bookId, quantity);
  if (!changed) {
    throw new AppError(404, 'That book is not in your cart.');
  }
  res.status(200).json({ status: 'success', message: 'Quantity updated.' });
};

// DELETE /api/v1/cart/:bookId
const removeFromCart = async (req, res) => {
  const { bookId } = matchedData(req);
  const removed = await cartModel.remove(req.user.id, bookId);
  if (!removed) {
    throw new AppError(404, 'That book is not in your cart.');
  }
  res.status(200).json({ status: 'success', message: 'Removed from your cart.' });
};

module.exports = { getCart, getCartCount, addToCart, updateQuantity, removeFromCart };
