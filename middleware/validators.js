// Server-side input validation with express-validator.
// Every route that receives data runs one of these rule lists first, then
// handleValidation. Bad input is rejected with 400 before it reaches a controller.
const { body, param, query, validationResult } = require('express-validator');
const { ORDER_STATUSES } = require('../utils/orderStatus');
const { passesLuhn, isExpiryValid } = require('../utils/card');

const CONDITIONS = ['New', 'Like New', 'Very Good', 'Good', 'Acceptable'];

const strongPasswordMessage =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';

const strongPasswordOptions = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

// Sends back the first problem found (plus the full list)
const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((err) => ({ field: err.path, message: err.msg }));
    return res.status(400).json({ status: 'fail', message: errors[0].message, errors });
  }
  next();
};

const idParam = (name) =>
  param(name).isInt({ min: 1 }).withMessage('Invalid id.').toInt();

// ----- Auth & account -----

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name is too long.'),
  body('email').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address.')
    .isLength({ max: 255 }),
  body('password').isStrongPassword(strongPasswordOptions).withMessage(strongPasswordMessage)
    .isLength({ max: 72 }).withMessage('Password is too long.'), // bcrypt only uses 72 bytes
];

const loginRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const accountRules = [
  body('name').trim().notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name is too long.'),
  body('email').trim().toLowerCase().isEmail().withMessage('Please enter a valid email address.'),
  body('address').optional({ values: 'null' }).trim()
    .isLength({ max: 500 }).withMessage('Address is too long.'),
  body('currentPassword').optional({ values: 'falsy' }).isString(),
  body('newPassword').optional({ values: 'falsy' })
    .isStrongPassword(strongPasswordOptions).withMessage(strongPasswordMessage)
    .isLength({ max: 72 }).withMessage('Password is too long.'),
];

// ----- Books -----

const bookQueryRules = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('genre').optional().trim().isLength({ max: 100 }),
  query('author').optional().trim().isLength({ max: 255 }),
  query('condition').optional({ values: 'falsy' })
    .isIn(['new', 'used', ...CONDITIONS]).withMessage('Unknown condition.'),
  query('minPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Min price must be a positive number.').toFloat(),
  query('maxPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Max price must be a positive number.').toFloat(),
  query('sort').optional({ values: 'falsy' }).isIn(['newest', 'price_asc', 'price_desc', 'title']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const bookRules = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 255 }),
  body('author').trim().notEmpty().withMessage('Author is required.').isLength({ max: 255 }),
  body('genre').trim().notEmpty().withMessage('Genre is required.').isLength({ max: 100 }),
  body('isbn').optional({ values: 'falsy' }).trim()
    .matches(/^[0-9Xx-]{10,17}$/).withMessage('ISBN should be 10 or 13 digits.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  body('bookCondition').isIn(CONDITIONS).withMessage('Choose a valid condition.'),
  body('conditionNote').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('price').isFloat({ min: 0, max: 100000 }).withMessage('Price must be a number from 0 to 100000.').toFloat(),
  body('stock').isInt({ min: 0, max: 10000 }).withMessage('Stock must be a whole number from 0 to 10000.').toInt(),
  body('coverUrl').optional({ values: 'falsy' }).trim()
    .isURL({ protocols: ['https'], require_protocol: true }).withMessage('Cover URL must start with https://'),
];

const stockRules = [
  idParam('id'),
  body('stock').isInt({ min: 0, max: 10000 }).withMessage('Stock must be a whole number from 0 to 10000.').toInt(),
];

// ----- Wishlist & cart -----

const bookIdBodyRules = [
  body('bookId').isInt({ min: 1 }).withMessage('Invalid book.').toInt(),
];

const addToCartRules = [
  body('bookId').isInt({ min: 1 }).withMessage('Invalid book.').toInt(),
  body('quantity').optional().isInt({ min: 1, max: 20 }).withMessage('Quantity must be between 1 and 20.').toInt(),
];

const cartQuantityRules = [
  idParam('bookId'),
  body('quantity').isInt({ min: 1, max: 20 }).withMessage('Quantity must be between 1 and 20.').toInt(),
];

// ----- Checkout -----

const checkoutRules = [
  body('address').trim().notEmpty().withMessage('Please enter a delivery address.')
    .isLength({ min: 10, max: 500 }).withMessage('Please enter the full delivery address (at least 10 characters).'),
];

const paymentRules = [
  idParam('orderId'),
  body('cardName').trim().notEmpty().withMessage('Name on card is required.').isLength({ max: 100 }),
  body('cardNumber').custom((value) => passesLuhn(value)).withMessage('Card number is not valid.'),
  body('expiry').custom((value) => isExpiryValid(value)).withMessage('Expiry date must be MM/YY and not in the past.'),
  body('cvv').matches(/^\d{3,4}$/).withMessage('CVV must be 3 or 4 digits.'),
];

// ----- Orders -----

const orderStatusRules = [
  idParam('id'),
  body('status').isIn(ORDER_STATUSES).withMessage('Unknown status.'),
];

const orderListRules = [
  query('status').optional({ values: 'falsy' }).isIn(ORDER_STATUSES).withMessage('Unknown status.'),
];

// ----- Preferences -----

const preferenceRules = [
  body('sort').isIn(['newest', 'price_asc', 'price_desc', 'title']).withMessage('Unknown sort option.'),
];

module.exports = {
  CONDITIONS,
  handleValidation,
  idParam,
  registerRules,
  loginRules,
  accountRules,
  bookQueryRules,
  bookRules,
  stockRules,
  bookIdBodyRules,
  addToCartRules,
  cartQuantityRules,
  checkoutRules,
  paymentRules,
  orderStatusRules,
  orderListRules,
  preferenceRules,
};
