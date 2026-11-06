// Unit tests for the card checks and the mock payment service. Run with:  npm test
process.env.PAYMENT_DELAY_MS = '1'; // don't wait in tests

const test = require('node:test');
const assert = require('node:assert');
const { passesLuhn, isExpiryValid, cleanCardNumber } = require('../utils/card');
const { processPayment } = require('../services/paymentService');

test('accepts valid test card numbers (with or without spaces)', () => {
  assert.strictEqual(passesLuhn('4242424242424242'), true);
  assert.strictEqual(passesLuhn('4242 4242 4242 4242'), true);
  assert.strictEqual(passesLuhn('4000 0000 0000 0002'), true);
});

test('rejects card numbers with a typo or wrong length', () => {
  assert.strictEqual(passesLuhn('4242424242424241'), false);
  assert.strictEqual(passesLuhn('1234'), false);
  assert.strictEqual(passesLuhn('abcd efgh ijkl mnop'), false);
  assert.strictEqual(passesLuhn(''), false);
});

test('expiry date must be MM/YY and not in the past', () => {
  const today = new Date(2026, 10, 5); // 5 Nov 2026
  assert.strictEqual(isExpiryValid('11/26', today), true); // valid until the end of the month
  assert.strictEqual(isExpiryValid('12/29', today), true);
  assert.strictEqual(isExpiryValid('10/26', today), false);
  assert.strictEqual(isExpiryValid('13/27', today), false);
  assert.strictEqual(isExpiryValid('1/27', today), false);
});

test('cleanCardNumber removes spaces and dashes', () => {
  assert.strictEqual(cleanCardNumber('4242-4242 4242 4242'), '4242424242424242');
});

test('successful payment returns a reference and only the last 4 digits', async () => {
  const result = await processPayment({ cardNumber: '4242 4242 4242 4242', amount: 100 });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.last4, '4242');
  assert.match(result.reference, /^PAY-[0-9A-F]{12}$/);
  assert.ok(!JSON.stringify(result).includes('4242424242424242'), 'full card number must not be returned');
});

test('the declined test card fails', async () => {
  const result = await processPayment({ cardNumber: '4000 0000 0000 0002', amount: 100 });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.last4, '0002');
});
