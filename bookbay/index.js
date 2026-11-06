// Creates and configures the Express application (the "app").
// server.js imports this and starts listening.
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const { securityHeaders, checkOrigin } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRouter = require('./routes/authRoutes');
const accountRouter = require('./routes/accountRoutes');
const bookRouter = require('./routes/bookRoutes');
const wishlistRouter = require('./routes/wishlistRoutes');
const cartRouter = require('./routes/cartRoutes');
const checkoutRouter = require('./routes/checkoutRoutes');
const orderRouter = require('./routes/orderRoutes');
const adminRouter = require('./routes/adminRoutes');
const preferenceRouter = require('./routes/preferenceRoutes');
const pageRouter = require('./routes/pageRoutes');

const app = express();

app.disable('x-powered-by'); // don't advertise that we use Express

// Middleware that runs for every request
app.use(securityHeaders);
app.use(express.json({ limit: '20kb' })); // parse JSON bodies (and refuse huge ones)
app.use(cookieParser()); // fills req.cookies
app.use(express.static(path.join(__dirname, 'public'))); // CSS, JS and images

// JSON API (version 1)
app.use('/api', checkOrigin);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/account', accountRouter);
app.use('/api/v1/books', bookRouter);
app.use('/api/v1/wishlist', wishlistRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/preferences', preferenceRouter);

// HTML pages
app.use('/', pageRouter);

// Must be last: unknown URLs, then errors
app.use(notFound);
app.use(errorHandler);

module.exports = { app };
