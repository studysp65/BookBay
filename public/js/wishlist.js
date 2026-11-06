// Wishlist page: saved books, with "Move to cart" and "Remove".

const wishlistContainer = document.getElementById('wishlist-container');

const renderWishlist = (items) => {
  if (items.length === 0) {
    wishlistContainer.innerHTML = `
      <div class="panel empty-state">
        <p>Your wishlist is empty.</p>
        <a class="btn" href="/">Browse books</a>
      </div>`;
    return;
  }

  const rows = items
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
        <td class="price">${formatPrice(item.price)}</td>
        <td>${stockHtml(item.stock)}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn-small js-move" data-id="${item.bookId}" ${item.stock <= 0 ? 'disabled' : ''}>Move to cart</button>
            <button type="button" class="btn btn-small btn-danger js-remove" data-id="${item.bookId}">Remove</button>
          </div>
        </td>
      </tr>`)
    .join('');

  wishlistContainer.innerHTML = `
    <div class="table-wrap panel">
      <table>
        <thead><tr><th>Book</th><th>Condition</th><th>Price</th><th>Availability</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  attachCoverFallbacks(wishlistContainer);
};

const loadWishlist = async () => {
  try {
    const result = await apiRequest('/wishlist');
    renderWishlist(result.data.items);
  } catch (err) {
    wishlistContainer.innerHTML = '';
    showMessage('page-message', err.message);
  }
};

wishlistContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const bookId = button.dataset.id;

  setLoading(button, true, '...');
  try {
    let result;
    if (button.classList.contains('js-move')) {
      result = await apiRequest(`/wishlist/${bookId}/move-to-cart`, { method: 'POST' });
      refreshCartCount();
    } else {
      result = await apiRequest(`/wishlist/${bookId}`, { method: 'DELETE' });
    }
    showToast(result.message);
    loadWishlist();
  } catch (err) {
    setLoading(button, false);
    showToast(err.message, 'error');
  }
});

loadWishlist();
