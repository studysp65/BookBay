// Mock payment service (no real money is ever taken).
// Test cards:
//   4242 4242 4242 4242  -> payment succeeds
//   4000 0000 0000 0002  -> payment is declined
// Any other card number that passes the Luhn check also succeeds.
const crypto = require('crypto');
const { cleanCardNumber } = require('../utils/card');

const DECLINED_TEST_CARD = '4000000000000002';
const PAYMENT_DELAY_MS = Number(process.env.PAYMENT_DELAY_MS) || 800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Returns { success, reference, last4, message }.
// The full card number and CVV are only used here and are never stored or logged.
const processPayment = async ({ cardNumber, amount }) => {
  await wait(PAYMENT_DELAY_MS); // pretend we are talking to a bank

  const digits = cleanCardNumber(cardNumber);
  const last4 = digits.slice(-4);
  const reference = 'PAY-' + crypto.randomBytes(6).toString('hex').toUpperCase();

  if (digits === DECLINED_TEST_CARD) {
    return { success: false, reference, last4, message: 'Card declined by the bank.' };
  }

  return { success: true, reference, last4, message: `Payment of ${amount} approved.` };
};

module.exports = { processPayment };
