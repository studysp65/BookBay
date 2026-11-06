const express = require('express');
const {
  getCart,
  getCartCount,
  addToCart,
  updateQuantity,
  removeFromCart,
} = require('../controllers/cartController');
const { verifyToken } = require('../middleware/auth');
const {
  addToCartRules,
  cartQuantityRules,
  idParam,
  handleValidation,
} = require('../middleware/validators');

const cartRouter = express.Router();

cartRouter.use(verifyToken);

cartRouter.get('/', getCart);
cartRouter.get('/count', getCartCount);
cartRouter.post('/', addToCartRules, handleValidation, addToCart);
cartRouter.patch('/:bookId', cartQuantityRules, handleValidation, updateQuantity);
cartRouter.delete('/:bookId', idParam('bookId'), handleValidation, removeFromCart);

module.exports = cartRouter;
