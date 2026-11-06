// Socket.IO (WebSockets) setup for live order tracking.
// The browser connects, sends "order:watch" with an order id, and joins a
// "room" for that order. When the admin changes the status, the server sends
// "order:status" to that room and the tracking page updates without refreshing.
const { Server } = require('socket.io');
const { TOKEN_COOKIE, decodeToken, parseCookieHeader } = require('../utils/tokens');
const orderModel = require('../models/orderModel');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer);

  // Only logged-in users may connect. The login cookie is sent automatically
  // with the WebSocket handshake because it's the same website.
  io.use((socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const user = decodeToken(cookies[TOKEN_COOKIE]);
    if (!user) {
      return next(new Error('Not logged in'));
    }
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    // Admins get notified about every order change (used by the admin orders page)
    if (socket.user.role === 'admin') {
      socket.join('admins');
    }

    socket.on('order:watch', async (orderId, reply) => {
      const respond = typeof reply === 'function' ? reply : () => {};
      try {
        const order = await orderModel.findById(Number(orderId));
        // Ownership check: customers may only watch their own orders
        if (!order || (order.userId !== socket.user.id && socket.user.role !== 'admin')) {
          return respond({ ok: false, message: 'Order not found' });
        }
        socket.join(`order:${order.id}`);
        respond({ ok: true, status: order.status });
      } catch (err) {
        console.error('order:watch failed:', err.message);
        respond({ ok: false, message: 'Server error' });
      }
    });
  });

  return io;
};

// Sends the new status to everyone watching this order, and to all admins
const emitOrderUpdate = (update) => {
  if (!io) return; // e.g. when running unit tests without a server
  io.to(`order:${update.orderId}`).emit('order:status', update);
  io.to('admins').emit('order:updated', update);
};

module.exports = { initSocket, emitOrderUpdate };
