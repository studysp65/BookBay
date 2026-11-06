// Order history page: all of the customer's orders.

const ordersContainer = document.getElementById('orders-container');

const loadOrders = async () => {
  try {
    const result = await apiRequest('/orders');
    const orders = result.data.orders;

    if (orders.length === 0) {
      ordersContainer.innerHTML = `
        <div class="panel empty-state">
          <p>You haven't placed any orders yet.</p>
          <a class="btn" href="/">Browse books</a>
        </div>`;
      return;
    }

    const rows = orders
      .map((order) => `
        <tr>
          <td><strong>#${order.id}</strong></td>
          <td>${formatDate(order.createdAt)}</td>
          <td>${order.itemCount}</td>
          <td class="price">${formatPrice(order.total)}</td>
          <td>${statusHtml(order.status)}</td>
          <td>${statusHtml(order.paymentStatus)}</td>
          <td><a class="btn btn-small btn-outline" href="/order?id=${order.id}">View &amp; track</a></td>
        </tr>`)
      .join('');

    ordersContainer.innerHTML = `
      <div class="table-wrap panel">
        <table>
          <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (err) {
    ordersContainer.innerHTML = '';
    showMessage('page-message', err.message);
  }
};

loadOrders();
