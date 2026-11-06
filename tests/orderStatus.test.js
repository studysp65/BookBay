// Unit tests for the order status rules. Run with:  npm test
const test = require('node:test');
const assert = require('node:assert');
const { canAdminChangeStatus, getAllowedNextStatuses } = require('../utils/orderStatus');

test('admin can move an order forward one step at a time', () => {
  assert.strictEqual(canAdminChangeStatus('paid', 'processing'), true);
  assert.strictEqual(canAdminChangeStatus('processing', 'shipped'), true);
  assert.strictEqual(canAdminChangeStatus('shipped', 'delivered'), true);
});

test('admin cannot ship an order that was never paid', () => {
  assert.strictEqual(canAdminChangeStatus('pending', 'shipped'), false);
  assert.strictEqual(canAdminChangeStatus('pending', 'paid'), false);
});

test('admin cannot skip steps or go backwards', () => {
  assert.strictEqual(canAdminChangeStatus('paid', 'delivered'), false);
  assert.strictEqual(canAdminChangeStatus('delivered', 'pending'), false);
  assert.strictEqual(canAdminChangeStatus('shipped', 'processing'), false);
});

test('orders can be cancelled before they are shipped, but not after', () => {
  assert.strictEqual(canAdminChangeStatus('pending', 'cancelled'), true);
  assert.strictEqual(canAdminChangeStatus('paid', 'cancelled'), true);
  assert.strictEqual(canAdminChangeStatus('processing', 'cancelled'), true);
  assert.strictEqual(canAdminChangeStatus('shipped', 'cancelled'), false);
});

test('finished orders have no next status', () => {
  assert.deepStrictEqual(getAllowedNextStatuses('delivered'), []);
  assert.deepStrictEqual(getAllowedNextStatuses('cancelled'), []);
  assert.deepStrictEqual(getAllowedNextStatuses('not-a-status'), []);
});
