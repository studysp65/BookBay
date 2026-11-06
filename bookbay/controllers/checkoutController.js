// Checkout controller: thin layer that passes the request to CheckoutService.
const { matchedData } = require('express-validator');
const checkoutService = require('../services/checkoutService');

// POST /api/v1/checkout  { address }
// Reserves the stock and creates a "pending" order
const startCheckout = async (req, res) => {
  const { address } = matchedData(req);
  const order = await checkoutService.startCheckout(req.user.id, address);
  res.status(201).json({
    status: 'success',
    message: 'Order created. Please complete the payment.',
    data: order,
  });
};

// POST /api/v1/checkout/:orderId/pay  { cardName, cardNumber, expiry, cvv }
const payForOrder = async (req, res) => {
  const { orderId, cardNumber } = matchedData(req);
  // Only the card number is passed on (the service keeps just the last 4 digits).
  // cardName, expiry and cvv are validated and then thrown away.
  const result = await checkoutService.payForOrder(req.user.id, orderId, { cardNumber });
  res.status(200).json({
    status: 'success',
    message: 'Payment successful. Thank you for your order!',
    data: result,
  });
};

module.exports = { startCheckout, payForOrder };
