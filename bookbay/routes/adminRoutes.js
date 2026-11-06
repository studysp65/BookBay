const express = require('express');
const {
  getAllOrders,
  getOrderForAdmin,
  updateOrderStatus,
} = require('../controllers/orderController');
const { verifyAdmin } = require('../middleware/auth');
const {
  orderListRules,
  orderStatusRules,
  idParam,
  handleValidation,
} = require('../middleware/validators');

const adminRouter = express.Router();

// Principle of least privilege: every route in this file is admin-only
adminRouter.use(verifyAdmin);

adminRouter.get('/orders', orderListRules, handleValidation, getAllOrders);
adminRouter.get('/orders/:id', idParam('id'), handleValidation, getOrderForAdmin);
adminRouter.patch('/orders/:id/status', orderStatusRules, handleValidation, updateOrderStatus);

module.exports = adminRouter;
