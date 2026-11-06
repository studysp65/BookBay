// Small helper functions for cart maths. They don't touch the database,
// which makes them easy to unit test (see tests/cart.test.js).

// Works in cents so that 0.1 + 0.2 style rounding errors can't happen.
const toCents = (amount) => Math.round(Number(amount) * 100);

const calculateLineTotal = (price, quantity) => {
  return (toCents(price) * quantity) / 100;
};

// items: [{ price, quantity }]
const calculateTotal = (items) => {
  let totalCents = 0;
  for (const item of items) {
    totalCents += toCents(item.price) * item.quantity;
  }
  return totalCents / 100;
};

// items: [{ bookId, title, quantity, stock }]
// Returns a readable message for every item that doesn't have enough stock.
const findStockProblems = (items) => {
  const problems = [];
  for (const item of items) {
    if (item.stock <= 0) {
      problems.push({ bookId: item.bookId, message: `"${item.title}" is out of stock.` });
    } else if (item.quantity > item.stock) {
      problems.push({
        bookId: item.bookId,
        message: `Only ${item.stock} ${item.stock === 1 ? 'copy' : 'copies'} of "${item.title}" left.`,
      });
    }
  }
  return problems;
};

module.exports = { calculateLineTotal, calculateTotal, findStockProblems };
