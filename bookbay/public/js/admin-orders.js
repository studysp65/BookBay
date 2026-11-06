// Admin: see all orders and move them through their statuses (use case UC-17).
// Each change is pushed live to the customer's tracking page by the server.

let selectedOrderId = null;

const loadAdminOrders = async () => {
  const status = document.getElementById('status-filter').value;
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const tbody = document.getElementById('orders-table');

  try {
    const result = await apiRequest('/admin/orders' + query);
    const orders = result.data.orders;

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No orders found.</td></tr>';
      return;
    }

    tbody.innerHTML = orders
      .map((order) => `
        <tr class="${order.id === selectedOrderId ? 'selected' : ''}">
          <td><strong>#${order.id}</strong><div class="small muted">${formatDate(order.createdAt)}</div></td>
          <td>${escapeHtml(order.customerName)}<div class="small muted">${escapeHtml(order.customerEmail)}</div></td>
          <td class="price">${formatPrice(order.total)}</td>
          <td>${statusHtml(order.status)}</td>
          <td>${statusHtml(order.paymentStatus)}</td>
          <td><button type="button" class="btn btn-small btn-outline js-view" data-id="${order.id}">View</button></td>
        </tr>`)
      .join('');
  } catch (err) {
    showMessage('page-message', err.message);
  }
};

const renderOrderDetail = (order) => {
  const panel = document.getElementById('order-detail');

  const items = order.items
    .map((item) => `
      <li>
        <span>${escapeHtml(item.title)} <span class="small muted">(${escapeHtml(item.bookCondition)}) × ${item.quantity}</span></span>
        <span>${formatPrice(item.unitPrice * item.quantity)}</span>
      </li>`)
    .join('');

  const history = order.history
    .slice()
    .reverse()
    .map((entry) => `
      <li>
        <span>${statusHtml(entry.status)} ${escapeHtml(entry.note || '')}</span>
        <span class="small muted">${formatDate(entry.changedAt)}</span>
      </li>`)
    .join('');

  // Only the moves the server allows are offered (the server checks again anyway)
  const statusForm = order.allowedNextStatuses.length
    ? `<form id="status-form" class="status-form">
         <div>
           <label for="new-status">Move to</label>
           <select id="new-status">
             ${order.allowedNextStatuses.map((s) => `<option value="${s}">${STATUS_LABELS[s]}</option>`).join('')}
           </select>
         </div>
         <button type="submit" class="btn">Update status</button>
       </form>`
    : '<p class="muted">This order is finished. Its status can no longer change.</p>';

  panel.innerHTML = `
    <h2>Order #${order.id} ${statusHtml(order.status)}</h2>
    <div id="detail-message" class="hidden"></div>
    ${statusForm}
    <dl class="details-grid mt">
      <div><dt>Customer</dt><dd>${escapeHtml(order.customerName)}<br><span class="small">${escapeHtml(order.customerEmail)}</span></dd></div>
      <div><dt>Delivery address</dt><dd>${escapeHtml(order.deliveryAddress)}</dd></div>
      <div><dt>Payment</dt><dd>${statusHtml(order.paymentStatus)}<br>
        <span class="small">${escapeHtml(order.paymentRef || 'No reference')}${order.cardLast4 ? ' · •••• ' + escapeHtml(order.cardLast4) : ''}</span></dd></div>
    </dl>
    <h3 class="mt">Books</h3>
    <ul class="summary-list">${items}</ul>
    <div class="summary-total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
    <h3 class="mt">History</h3>
    <ul class="history">${history}</ul>`;

  const form = document.getElementById('status-form');
  if (form) form.addEventListener('submit', updateStatus);
};

const loadOrderDetail = async (id) => {
  try {
    const result = await apiRequest(`/admin/orders/${id}`);
    selectedOrderId = id;
    renderOrderDetail(result.data.order);
  } catch (err) {
    showMessage('page-message', err.message);
  }
};

const updateStatus = async (event) => {
  event.preventDefault();
  const button = event.target.querySelector('button[type="submit"]');
  const status = document.getElementById('new-status').value;

  if (status === 'cancelled' && !window.confirm('Cancel this order? The books will go back into stock.')) {
    return;
  }

  setLoading(button, true, 'Updating...');
  try {
    const result = await apiRequest(`/admin/orders/${selectedOrderId}/status`, {
      method: 'PATCH',
      body: { status },
    });
    showToast(result.message); // "Status updated"
    await loadOrderDetail(selectedOrderId);
    loadAdminOrders();
  } catch (err) {
    // Alternative flow 4a: status change not allowed
    showMessage('detail-message', err.message);
    setLoading(button, false);
  }
};

document.getElementById('orders-table').addEventListener('click', (event) => {
  const button = event.target.closest('.js-view');
  if (!button) return;
  loadOrderDetail(Number(button.dataset.id)).then(loadAdminOrders);
});

document.getElementById('status-filter').addEventListener('change', loadAdminOrders);

// Live updates: new paid orders and changes appear without refreshing
const connectAdminLiveUpdates = () => {
  const liveStatus = document.getElementById('live-status');
  if (typeof io === 'undefined') {
    liveStatus.textContent = 'Live updates unavailable';
    return;
  }
  const socket = io();
  socket.on('connect', () => {
    liveStatus.classList.add('on');
    liveStatus.textContent = 'Live updates on';
  });
  socket.on('disconnect', () => {
    liveStatus.classList.remove('on');
    liveStatus.textContent = 'Reconnecting...';
  });
  socket.on('order:updated', (update) => {
    loadAdminOrders();
    if (Number(update.orderId) === selectedOrderId) {
      loadOrderDetail(selectedOrderId);
    }
  });
};

loadAdminOrders();
connectAdminLiveUpdates();
