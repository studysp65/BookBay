// Page routes: send the HTML views. The pages then load their data from the
// JSON API with fetch(). Pages for logged-in users and admins are protected
// here on the server, not just hidden in the menu.
const express = require('express');
const path = require('path');
const { requireLoginPage, requireAdminPage } = require('../middleware/auth');

const pageRouter = express.Router();

const sendView = (fileName) => (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', fileName));
};

// Public pages
pageRouter.get('/', sendView('index.html'));
pageRouter.get('/book', sendView('book.html'));
pageRouter.get('/login', sendView('login.html'));
pageRouter.get('/register', sendView('register.html'));

// Customer pages (must be logged in)
pageRouter.get('/account', requireLoginPage, sendView('account.html'));
pageRouter.get('/wishlist', requireLoginPage, sendView('wishlist.html'));
pageRouter.get('/cart', requireLoginPage, sendView('cart.html'));
pageRouter.get('/checkout', requireLoginPage, sendView('checkout.html'));
pageRouter.get('/orders', requireLoginPage, sendView('orders.html'));
pageRouter.get('/order', requireLoginPage, sendView('order.html'));

// Admin pages (must be an admin)
pageRouter.get('/admin', requireAdminPage, (req, res) => res.redirect('/admin/orders'));
pageRouter.get('/admin/books', requireAdminPage, sendView(path.join('admin', 'books.html')));
pageRouter.get('/admin/orders', requireAdminPage, sendView(path.join('admin', 'orders.html')));

module.exports = pageRouter;
