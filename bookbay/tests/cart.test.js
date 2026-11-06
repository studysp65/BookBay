// Unit tests for the cart maths. Run with:  npm test
const test = require('node:test');
const assert = require('node:assert');
const { calculateLineTotal, calculateTotal, findStockProblems } = require('../utils/cart');

test('calculates a line total', () => {
  assert.strictEqual(calculateLineTotal(450, 3), 1350);
  assert.strictEqual(calculateLineTotal(19.99, 3), 59.97);
});

test('calculates the cart total without rounding errors', () => {
  // 0.1 + 0.2 is 0.30000000000000004 in plain JavaScript
  assert.strictEqual(calculateTotal([{ price: 0.1, quantity: 1 }, { price: 0.2, quantity: 1 }]), 0.3);
  assert.strictEqual(calculateTotal([{ price: 1850, quantity: 1 }, { price: 380.5, quantity: 2 }]), 2611);
});

test('an empty cart costs nothing', () => {
  assert.strictEqual(calculateTotal([]), 0);
});

test('reports books that are out of stock or short on stock', () => {
  const problems = findStockProblems([
    { bookId: 1, title: 'Dune', quantity: 1, stock: 0 },
    { bookId: 2, title: '1984', quantity: 3, stock: 1 },
    { bookId: 3, title: 'Sapiens', quantity: 2, stock: 5 },
  ]);
  assert.strictEqual(problems.length, 2);
  assert.strictEqual(problems[0].message, '"Dune" is out of stock.');
  assert.strictEqual(problems[1].message, 'Only 1 copy of "1984" left.');
});

test('no problems when there is enough stock', () => {
  assert.deepStrictEqual(findStockProblems([{ bookId: 1, title: 'A', quantity: 2, stock: 2 }]), []);
});
