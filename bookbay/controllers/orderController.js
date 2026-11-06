// Order controller: customers see their own orders, the admin sees and updates all orders.
const { matchedData } = require('express-validator');
const orderModel = require('../models/orderModel');
const orderService = require('../services/orderService');
const { getAllowedNextStatuses } = require('../utils/orderStatus');
const AppError = require('../utils/AppError');

// Loads one order with its books and status history
const loadFullOrder = async (id) => {
  const order = await orderModel.findById(id);
  if (!order) return null;
  order.items = await orderModel.findItems(id);
  order.history = await orderModel.findHistory(id);
  return order;
};

// ----- Customer -----

// GET /api/v1/orders
const getMyOrders = async (req, res) => {
  const orders = await orderModel.findByUser(req.user.id);
  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
};

// GET /api/v1/orders/:id
const getMyOrder = async (req, res) => {
  const { id } = matchedData(req);
  const order = await loadFullOrder(id);

  // Ownership check. We answer 404 (not 403) so nobody can find out
  // which order numbers exist.
  if (!order || order.userId !== req.user.id) {
    throw new AppError(404, 'Order not found.');
  }
  res.status(200).json({ status: 'success', data: { order } });
};

// ----- Admin -----

// GET /api/v1/admin/orders?status=
const getAllOrders = async (req, res) => {
  const { status } = matchedData(req, { locations: ['query'] });
  const orders = await orderModel.findAll(status || null);
  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
};

// GET /api/v1/admin/orders/:id
const getOrderForAdmin = async (req, res) => {
  const { id } = matchedData(req);
  const order = await loadFullOrder(id);
  if (!order) {
    throw new AppError(404, 'Order not found.');
  }
  order.allowedNextStatuses = getAllowedNextStatuses(order.status);
  res.status(200).json({ status: 'success', data: { order } });
};

// PATCH /api/v1/admin/orders/:id/status  { status }
const updateOrderStatus = async (req, res) => {
  const { id, status } = matchedData(req);
  const order = await orderService.updateStatusByAdmin(req.user.id, id, status);
  res.status(200).json({
    status: 'success',
    message: `Status updated to "${order.status}".`,
    data: { order },
  });
};

module.exports = {
  getMyOrders,
  getMyOrder,
  getAllOrders,
  getOrderForAdmin,
  updateOrderStatus,
};
