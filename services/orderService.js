// OrderService: business rules for changing an order's status.
const orderModel = require('../models/orderModel');
const bookModel = require('../models/bookModel');
const { withTransaction } = require('../utils/transaction');
const { canAdminChangeStatus, getAllowedNextStatuses } = require('../utils/orderStatus');
const { emitOrderUpdate } = require('../config/socket');
const { securityLog } = require('../utils/logger');
const AppError = require('../utils/AppError');

// Puts the books from an order back into stock (used when an order is cancelled)
const restockOrder = async (conn, orderId) => {
  const items = await orderModel.findItems(orderId, conn);
  for (const item of items) {
    if (item.bookId) {
      // bookId is null if the admin deleted the book after the order was made
      await bookModel.increaseStock(conn, item.bookId, item.quantity);
    }
  }
};

// Cancels an order inside an existing transaction and returns the stock
const cancelOrderInTransaction = async (conn, order, changedBy, note) => {
  await restockOrder(conn, order.id);
  await orderModel.updateStatus(conn, order.id, 'cancelled');
  if (order.paymentStatus === 'paid') {
    await orderModel.updatePaymentStatus(conn, order.id, 'refunded');
  }
  await orderModel.addHistory(conn, order.id, 'cancelled', changedBy, note);
};

// Admin moves an order to its next status (UC-17)
const updateStatusByAdmin = async (adminId, orderId, newStatus) => {
  const result = await withTransaction(async (conn) => {
    const order = await orderModel.lockById(conn, orderId);
    if (!order) {
      throw new AppError(404, 'Order not found.');
    }

    if (!canAdminChangeStatus(order.status, newStatus)) {
      throw new AppError(400, `An order cannot go from "${order.status}" to "${newStatus}".`);
    }

    if (newStatus === 'cancelled') {
      await cancelOrderInTransaction(conn, order, adminId, 'Cancelled by the store');
    } else {
      await orderModel.updateStatus(conn, orderId, newStatus);
      await orderModel.addHistory(conn, orderId, newStatus, adminId, null);
    }

    return { userId: order.userId, oldStatus: order.status };
  });

  securityLog('order_status_changed', {
    adminId,
    orderId,
    from: result.oldStatus,
    to: newStatus,
  });

  // Read the saved order again and push it live to the customer's tracking page
  const updated = await orderModel.findById(orderId);
  emitOrderUpdate({
    orderId: updated.id,
    status: updated.status,
    paymentStatus: updated.paymentStatus,
    changedAt: new Date().toISOString(),
  });

  return { ...updated, allowedNextStatuses: getAllowedNextStatuses(updated.status) };
};

module.exports = {
  restockOrder,
  cancelOrderInTransaction,
  updateStatusByAdmin,
};
