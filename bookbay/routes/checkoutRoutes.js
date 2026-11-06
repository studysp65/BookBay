const express = require('express');
const { startCheckout, payForOrder } = require('../controllers/checkoutController');
const { verifyToken } = require('../middleware/auth');
const { checkoutRules, paymentRules, handleValidation } = require('../middleware/validators');

const checkoutRouter = express.Router();

checkoutRouter.use(verifyToken);

checkoutRouter.post('/', checkoutRules, handleValidation, startCheckout);
checkoutRouter.post('/:orderId/pay', paymentRules, handleValidation, payForOrder);

module.exports = checkoutRouter;
