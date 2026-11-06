// Cart page: change quantities, remove books, go to checkout.

const cartContainer = document.getElementById('cart-container');

const renderCart = (cart) => {
  if (cart.items.length === 0) {
    cartContainer.innerHTML = `
      <div class="panel empty-state">
        <p>Your cart is empty.</p>
        <a class="btn" href="/">Browse books</a>
      </div>`;
    return;
  }

  const rows = cart.items
    .map((item) => `
      <tr>
        <td>
          <div class="cell-book">
            ${coverImgHtml(item, 'thumb')}
            <div>
              <a href="/book?id=${item.bookId}">${escapeHtml(item.title)}</a>
              <div class="small muted">${escapeHtml(item.author)}</div>
            </div>
          </div>
        </td>
        <td>${conditionBadgeHtml(item.bookCondition)}</td>
        <td>${formatPrice(item.price)}</td>
        <td>
          <input type="number" class="js-qty" data-id="${item.bookId}" value="${item.quantity}"
                 min="1" max="${Math.max(1, Math.min(item.stock, 20))}" aria-label="Quantity of ${escapeHtml(item.title)}">
          <div class="small">${stockHtml(item.stock)}</div>
        </td>
        <td class="price">${formatPrice(item.lineTotal)}</td>
        <td><button type="button" class="btn btn-small btn-danger js-remove" data-id="${item.bookId}">Remove</button></td>
      </tr>`)
    .join('');

  const problems = cart.problems.length
    ? `<div class="message message--error">${cart.problems.map((p) => escapeHtml(p.message)).join('<br>')}
         <br>Please change these items before checking out.</div>`
    : '';

  cartContainer.innerHTML = `
    ${problems}
    <div class="table-wrap panel">
      <table>
        <thead><tr><th>Book</th><th>Condition</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="totals">
      <span class="muted">${cart.count} ${cart.count === 1 ? 'item' : 'items'}</span>
      <span class="grand-total">Total: ${formatPrice(cart.total)}</span>
      ${cart.problems.length
        ? '<button type="button" class="btn" disabled>Checkout</button>'
        : '<a class="btn" href="/checkout">Checkout</a>'}
    </div>`;
  attachCoverFallbacks(cartContainer);
};

const loadCart = async () => {
  try {
    const result = await apiRequest('/cart');
    renderCart(result.data);
    refreshCartCount();
  } catch (err) {
    cartContainer.innerHTML = '';
    showMessage('page-message', err.message);
  }
};

// Quantity changed
cartContainer.addEventListener('change', async (event) => {
  const input = event.target.closest('.js-qty');
  if (!input) return;
  const quantity = Number(input.value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast('Quantity must be at least 1.', 'error');
    loadCart();
    return;
  }
  try {
    await apiRequest(`/cart/${input.dataset.id}`, { method: 'PATCH', body: { quantity } });
  } catch (err) {
    showToast(err.message, 'error');
  }
  loadCart(); // reload so the totals come from the server
});

// Remove clicked
cartContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('.js-remove');
  if (!button) return;
  setLoading(button, true, '...');
  try {
    const result = await apiRequest(`/cart/${button.dataset.id}`, { method: 'DELETE' });
    showToast(result.message);
  } catch (err) {
    showToast(err.message, 'error');
  }
  loadCart();
});

loadCart();
