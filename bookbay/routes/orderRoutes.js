const express = require('express');
const { getMyOrders, getMyOrder } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');
const { idParam, handleValidation } = require('../middleware/validators');

const orderRouter = express.Router();

orderRouter.use(verifyToken);

orderRouter.get('/', getMyOrders);
orderRouter.get('/:id', idParam('id'), handleValidation, getMyOrder);

module.exports = orderRouter;
