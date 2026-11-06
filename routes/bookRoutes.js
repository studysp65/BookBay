const express = require('express');
const {
  listBooks,
  getFilterOptions,
  getRecentlyViewed,
  getBook,
  createBook,
  updateBook,
  updateStock,
  deleteBook,
} = require('../controllers/bookController');
const { verifyAdmin } = require('../middleware/auth');
const {
  bookQueryRules,
  bookRules,
  stockRules,
  idParam,
  handleValidation,
} = require('../middleware/validators');

const bookRouter = express.Router();

// Anyone (even guests) can browse
bookRouter.get('/', bookQueryRules, handleValidation, listBooks);
bookRouter.post('/', verifyAdmin, bookRules, handleValidation, createBook);

// These two must come before '/:id', otherwise "filters" would be read as an id
bookRouter.get('/filters', getFilterOptions);
bookRouter.get('/recent', getRecentlyViewed);

bookRouter.get('/:id', idParam('id'), handleValidation, getBook);
bookRouter.put('/:id', verifyAdmin, idParam('id'), bookRules, handleValidation, updateBook);
bookRouter.delete('/:id', verifyAdmin, idParam('id'), handleValidation, deleteBook);
bookRouter.patch('/:id/stock', verifyAdmin, stockRules, handleValidation, updateStock);

module.exports = bookRouter;
