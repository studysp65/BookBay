// CheckoutService: the checkout and payment steps (UC-08).
//
// Step 1 startCheckout: check the cart, recalculate the total from database
//   prices, reserve the stock and create a "pending" order, all in ONE transaction.
// Step 2 payForOrder: run the mock payment. Success -> "paid" and the cart is
//   emptied. Failure -> "cancelled", the stock goes back and the cart is kept.
const cartModel = require('../models/cartModel');
const bookModel = require('../models/bookModel');
const orderModel = require('../models/orderModel');
const paymentService = require('./paymentService');
const { cancelOrderInTransaction } = require('./orderService');
const { withTransaction } = require('../utils/transaction');
const { calculateTotal, findStockProblems } = require('../utils/cart');
const { emitOrderUpdate } = require('../config/socket');
const AppError = require('../utils/AppError');

const startCheckout = async (userId, deliveryAddress) => {
  return withTransaction(async (conn) => {
    // If the customer left an earlier checkout unpaid, cancel it so its
    // reserved stock is released before we reserve stock again.
    const oldPendingIds = await orderModel.findPendingIdsByUser(conn, userId);
    for (const id of oldPendingIds) {
      await cancelOrderInTransaction(conn, { id, paymentStatus: 'unpaid' }, userId, 'Replaced by a new checkout');
    }

    const cartItems = await cartModel.findByUser(userId, conn);
    if (cartItems.length === 0) {
      throw new AppError(400, 'Your cart is empty.');
    }

    // Lock the books and read the REAL price and stock from the database.
    // Any price sent by the browser is ignored.
    const bookIds = cartItems.map((item) => item.bookId);
    const lockedBooks = await bookModel.lockForUpdate(conn, bookIds);

    const items = cartItems.map((cartItem) => {
      const book = lockedBooks.find((b) => b.id === cartItem.bookId);
      if (!book) {
        throw new AppError(409, `"${cartItem.title}" is no longer available. Please update your cart.`);
      }
      return {
        bookId: cartItem.bookId,
        title: book.title,
        bookCondition: book.bookCondition,
        price: book.price,
        stock: book.stock,
        quantity: cartItem.quantity,
      };
    });

    // Alternative flow 5a: not enough stock -> throwing rolls everything back
    const problems = findStockProblems(items);
    if (problems.length > 0) {
      throw new AppError(409, problems.map((p) => p.message).join(' '), { problems });
    }

    const total = calculateTotal(items);
    const orderId = await orderModel.create(conn, { userId, total, deliveryAddress });

    for (const item of items) {
      await orderModel.addItem(conn, orderId, item);
      const reserved = await bookModel.decreaseStock(conn, item.bookId, item.quantity);
      if (!reserved) {
        throw new AppError(409, `"${item.title}" just sold out. Please update your cart.`);
      }
    }

    await orderModel.addHistory(conn, orderId, 'pending', userId, 'Order placed, waiting for payment');

    return {
      orderId,
      total,
      items: items.map(({ stock, ...rest }) => rest), // stock is not needed by the browser
    };
  });
};

const payForOrder = async (userId, orderId, card) => {
  // Ownership check: a customer can only pay for their own order
  const order = await orderModel.findById(orderId);
  if (!order || order.userId !== userId) {
    throw new AppError(404, 'Order not found.');
  }
  if (order.status !== 'pending') {
    throw new AppError(409, 'This order can no longer be paid. Please check out again.');
  }

  const payment = await paymentService.processPayment({
    cardNumber: card.cardNumber,
    amount: order.total,
  });

  await withTransaction(async (conn) => {
    // Lock the order and check again: the admin might have cancelled it
    // while the payment was being processed.
    const lockedOrder = await orderModel.lockById(conn, orderId);
    if (!lockedOrder || lockedOrder.status !== 'pending') {
      throw new AppError(409, 'This order was cancelled. Please check out again.');
    }

    if (payment.success) {
      await orderModel.updatePayment(conn, orderId, {
        paymentStatus: 'paid',
        paymentRef: payment.reference,
        cardLast4: payment.last4,
      });
      await orderModel.updateStatus(conn, orderId, 'paid');
      await orderModel.addHistory(conn, orderId, 'paid', userId, `Payment ${payment.reference} received`);
      await cartModel.clear(userId, conn);
    } else {
      // Alternative flow 8a: payment declined -> cancel and return the stock, keep the cart
      await orderModel.updatePayment(conn, orderId, {
        paymentStatus: 'failed',
        paymentRef: payment.reference,
        cardLast4: payment.last4,
      });
      await cancelOrderInTransaction(conn, lockedOrder, userId, 'Payment failed');
    }
  });

  emitOrderUpdate({
    orderId,
    status: payment.success ? 'paid' : 'cancelled',
    paymentStatus: payment.success ? 'paid' : 'failed',
    changedAt: new Date().toISOString(),
  });

  if (!payment.success) {
    throw new AppError(402, 'Payment failed, please try again. Your cart has been kept.');
  }

  return {
    orderId,
    status: 'paid',
    paymentRef: payment.reference,
    cardLast4: payment.last4,
    total: order.total,
  };
};

module.exports = { startCheckout, payForOrder };
