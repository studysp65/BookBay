// Order tracking page: /order?id=12
// Shows the status timeline and updates it LIVE over WebSockets (Socket.IO)
// when the admin changes the status, without refreshing the page.

const orderId = Number(getQueryParam('id'));
const TIMELINE_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const renderTimeline = (order) => {
  // When was each status reached? (taken from the history)
  const reachedAt = {};
  order.history.forEach((entry) => {
    reachedAt[entry.status] = entry.changedAt;
  });

  let steps = TIMELINE_STEPS.map((status) => {
    let className = '';
    if (reachedAt[status]) className = 'done';
    if (order.status === status) className = 'done current';
    const time = reachedAt[status] ? `<span class="step-time">${formatDate(reachedAt[status])}</span>` : '';
    return `<li class="${className}">${STATUS_LABELS[status]}${time}</li>`;
  });

  if (order.status === 'cancelled') {
    // Only show the steps the order actually reached, then "Cancelled"
    steps = steps.filter((step, index) => reachedAt[TIMELINE_STEPS[index]]);
    steps.push(`<li class="cancelled">Cancelled<span class="step-time">${formatDate(reachedAt.cancelled)}</span></li>`);
  }

  document.getElementById('timeline').innerHTML = steps.join('');
};

const renderOrder = (order) => {
  document.title = `Order #${order.id} – BookBay`;
  document.getElementById('order-title').innerHTML = `Order #${order.id} ${statusHtml(order.status)}`;
  document.getElementById('order-date').textContent = 'Placed on ' + formatDate(order.createdAt);

  renderTimeline(order);

  document.getElementById('order-items').innerHTML = order.items
    .map((item) => `
      <tr>
        <td>${item.bookId ? `<a href="/book?id=${item.bookId}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</td>
        <td>${conditionBadgeHtml(item.bookCondition)}</td>
        <td>${formatPrice(item.unitPrice)}</td>
        <td>${item.quantity}</td>
        <td>${formatPrice(item.unitPrice * item.quantity)}</td>
      </tr>`)
    .join('');
  document.getElementById('order-total').textContent = 'Total: ' + formatPrice(order.total);

  document.getElementById('order-details').innerHTML = `
    <div><dt>Delivery address</dt><dd>${escapeHtml(order.deliveryAddress)}</dd></div>
    <div><dt>Payment</dt><dd>${statusHtml(order.paymentStatus)}</dd></div>
    <div><dt>Payment reference</dt><dd>${escapeHtml(order.paymentRef || '—')}</dd></div>
    <div><dt>Card</dt><dd>${order.cardLast4 ? '•••• ' + escapeHtml(order.cardLast4) : '—'}</dd></div>`;

  document.getElementById('order-history').innerHTML = order.history
    .slice()
    .reverse() // newest first
    .map((entry) => `
      <li>
        <span>${statusHtml(entry.status)} ${escapeHtml(entry.note || '')}</span>
        <span class="small muted">${formatDate(entry.changedAt)}</span>
      </li>`)
    .join('');

  document.getElementById('order-view').classList.remove('hidden');
};

const loadOrder = async () => {
  try {
    const result = await apiRequest(`/orders/${orderId}`);
    renderOrder(result.data.order);
    return true;
  } catch (err) {
    document.getElementById('order-view').classList.add('hidden');
    showMessage('page-message', err.message);
    return false;
  }
};

const setLiveStatus = (isLive, text) => {
  const el = document.getElementById('live-status');
  el.classList.toggle('on', isLive);
  el.textContent = text;
};

const connectLiveUpdates = () => {
  if (typeof io === 'undefined') {
    setLiveStatus(false, 'Live updates unavailable');
    return;
  }

  const socket = io(); // connects to the same server; the login cookie is sent automatically

  // Runs on the first connection AND after every reconnection
  socket.on('connect', () => {
    socket.emit('order:watch', orderId, (reply) => {
      if (reply && reply.ok) {
        setLiveStatus(true, 'Live updates on');
        // Exception flow: if the connection dropped, we may have missed an update
        loadOrder();
      } else {
        setLiveStatus(false, 'Live updates unavailable');
      }
    });
  });

  socket.on('disconnect', () => setLiveStatus(false, 'Reconnecting...'));
  socket.on('connect_error', () => setLiveStatus(false, 'Live updates unavailable'));

  // The admin changed the status
  socket.on('order:status', async (update) => {
    if (Number(update.orderId) !== orderId) return;
    await loadOrder();
    showToast(`Order status updated: ${STATUS_LABELS[update.status] || update.status}`);
    const panel = document.getElementById('timeline-panel');
    panel.classList.remove('flash');
    void panel.offsetWidth; // restart the animation
    panel.classList.add('flash');
  });
};

const initOrderPage = async () => {
  if (!orderId) {
    showMessage('page-message', 'No order was selected.');
    return;
  }
  const found = await loadOrder();
  if (found) connectLiveUpdates();
};

initOrderPage();
