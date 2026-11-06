// Wishlist controller: save books for later and move them to the cart.
const { matchedData } = require('express-validator');
const wishlistModel = require('../models/wishlistModel');
const cartModel = require('../models/cartModel');
const bookModel = require('../models/bookModel');
const AppError = require('../utils/AppError');

// GET /api/v1/wishlist
const getWishlist = async (req, res) => {
  const items = await wishlistModel.findByUser(req.user.id);
  res.status(200).json({ status: 'success', results: items.length, data: { items } });
};

// POST /api/v1/wishlist  { bookId }
const addToWishlist = async (req, res) => {
  const { bookId } = matchedData(req);
  const book = await bookModel.findById(bookId);
  if (!book) {
    throw new AppError(404, 'Book not found.');
  }
  await wishlistModel.add(req.user.id, bookId);
  res.status(201).json({ status: 'success', message: `"${book.title}" saved to your wishlist.` });
};

// DELETE /api/v1/wishlist/:bookId
const removeFromWishlist = async (req, res) => {
  const { bookId } = matchedData(req);
  const removed = await wishlistModel.remove(req.user.id, bookId);
  if (!removed) {
    throw new AppError(404, 'That book is not in your wishlist.');
  }
  res.status(200).json({ status: 'success', message: 'Removed from your wishlist.' });
};

// POST /api/v1/wishlist/:bookId/move-to-cart
const moveToCart = async (req, res) => {
  const { bookId } = matchedData(req);
  const userId = req.user.id;

  const inWishlist = await wishlistModel.exists(userId, bookId);
  if (!inWishlist) {
    throw new AppError(404, 'That book is not in your wishlist.');
  }

  const book = await bookModel.findById(bookId);
  if (!book || book.stock <= 0) {
    throw new AppError(409, 'Sorry, this book is out of stock.');
  }

  const cartItem = await cartModel.findItem(userId, bookId);
  const quantityInCart = cartItem ? cartItem.quantity : 0;
  if (quantityInCart + 1 > book.stock) {
    throw new AppError(409, `You already have all ${book.stock} available copies in your cart.`);
  }

  await cartModel.addOrIncrease(userId, bookId, 1);
  await wishlistModel.remove(userId, bookId);

  res.status(200).json({ status: 'success', message: `"${book.title}" moved to your cart.` });
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, moveToCart };
