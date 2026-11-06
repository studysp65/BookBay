// The order status flow:
// pending -> paid -> processing -> shipped -> delivered   (or cancelled)
const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

// Which status the ADMIN may move an order to from each status.
// "paid" is not in any list: an order only becomes paid through a successful payment,
// so an admin can never ship an order that was never paid.
const ADMIN_TRANSITIONS = {
  pending: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const getAllowedNextStatuses = (currentStatus) => {
  return ADMIN_TRANSITIONS[currentStatus] || [];
};

const canAdminChangeStatus = (currentStatus, newStatus) => {
  return getAllowedNextStatuses(currentStatus).includes(newStatus);
};

module.exports = {
  ORDER_STATUSES,
  getAllowedNextStatuses,
  canAdminChangeStatus,
};
