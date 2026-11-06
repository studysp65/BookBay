const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
} = require('../controllers/wishlistController');
const { verifyToken } = require('../middleware/auth');
const { bookIdBodyRules, idParam, handleValidation } = require('../middleware/validators');

const wishlistRouter = express.Router();

wishlistRouter.use(verifyToken);

wishlistRouter.get('/', getWishlist);
wishlistRouter.post('/', bookIdBodyRules, handleValidation, addToWishlist);
wishlistRouter.delete('/:bookId', idParam('bookId'), handleValidation, removeFromWishlist);
wishlistRouter.post('/:bookId/move-to-cart', idParam('bookId'), handleValidation, moveToCart);

module.exports = wishlistRouter;
