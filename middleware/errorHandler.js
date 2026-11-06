// Error handling middleware. Express 5 sends any error thrown inside an
// async controller here automatically, so controllers don't need try/catch.
const path = require('path');
const AppError = require('../utils/AppError');

// Unknown URL
const notFound = (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ status: 'fail', message: 'API route not found.' });
  }
  res.status(404).sendFile(path.join(__dirname, '..', 'views', '404.html'));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;

  // Broken JSON in the request body
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'The request body is not valid JSON.';
  }

  // Duplicate value in a UNIQUE column (e.g. email already used)
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'That value is already in use.';
  }

  if (statusCode >= 500) {
    // Log the real error for us, but don't show internal details to the user
    console.error(err);
    message = 'Something went wrong on the server. Please try again.';
  }

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    details: err instanceof AppError ? err.details : undefined,
  });
};

module.exports = { notFound, errorHandler };
