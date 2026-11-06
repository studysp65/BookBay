// Book details page: /book?id=5

const bookId = Number(getQueryParam('id'));

const renderBook = (book) => {
  const outOfStock = book.stock <= 0;
  const maxQuantity = Math.min(book.stock, 20);

  const conditionNote = book.bookCondition !== 'New' && book.conditionNote
    ? `<div class="condition-note"><strong>Condition note:</strong> ${escapeHtml(book.conditionNote)}</div>`
    : '';

  document.title = `${book.title} – BookBay`;
  document.getElementById('book-detail').innerHTML = `
    <div class="book-detail">
      <div>${coverImgHtml(book)}</div>
      <div>
        ${conditionBadgeHtml(book.bookCondition)}
        <h1>${escapeHtml(book.title)}</h1>
        <p class="meta">by ${escapeHtml(book.author)} · ${escapeHtml(book.genre)}${book.isbn ? ' · ISBN ' + escapeHtml(book.isbn) : ''}</p>
        <p><span class="price">${formatPrice(book.price)}</span> &nbsp; ${stockHtml(book.stock)}</p>
        ${conditionNote}
        <p>${escapeHtml(book.description || 'No description yet.')}</p>

        <div class="buy-box">
          <div>
            <label for="quantity">Quantity</label>
            <input type="number" id="quantity" class="qty" value="1" min="1" max="${maxQuantity}" ${outOfStock ? 'disabled' : ''}>
          </div>
          <button type="button" class="btn" id="add-to-cart" ${outOfStock ? 'disabled' : ''}>
            ${outOfStock ? 'Out of Stock' : 'Add to cart'}
          </button>
          <button type="button" class="btn btn-outline" id="add-to-wishlist">♡ Save to wishlist</button>
        </div>
        <div id="action-message" class="hidden"></div>
      </div>
    </div>`;

  attachCoverFallbacks(document.getElementById('book-detail'));

  document.getElementById('add-to-cart').addEventListener('click', addToCart);
  document.getElementById('add-to-wishlist').addEventListener('click', addToWishlist);
};

const renderOtherCopies = (copies) => {
  if (copies.length === 0) return;
  document.getElementById('other-copies').innerHTML = copies
    .map((copy) => `
      <tr>
        <td>${conditionBadgeHtml(copy.bookCondition)}</td>
        <td class="small">${escapeHtml(copy.conditionNote || '—')}</td>
        <td class="price">${formatPrice(copy.price)}</td>
        <td>${stockHtml(copy.stock)}</td>
        <td><a class="btn btn-small btn-outline" href="/book?id=${copy.id}">View</a></td>
      </tr>`)
    .join('');
  document.getElementById('other-copies-section').classList.remove('hidden');
};

const requireLogin = async () => {
  const user = await userReady;
  if (!user) goToLogin();
  return user;
};

const addToCart = async () => {
  if (!(await requireLogin())) return;
  const button = document.getElementById('add-to-cart');
  const quantity = Number(document.getElementById('quantity').value);

  setLoading(button, true, 'Adding...');
  try {
    const result = await apiRequest('/cart', { method: 'POST', body: { bookId, quantity } });
    showMessage('action-message', result.message, 'success');
    refreshCartCount();
  } catch (err) {
    showMessage('action-message', err.message);
  } finally {
    setLoading(button, false);
  }
};

const addToWishlist = async () => {
  if (!(await requireLogin())) return;
  try {
    const result = await apiRequest('/wishlist', { method: 'POST', body: { bookId } });
    showMessage('action-message', result.message, 'success');
  } catch (err) {
    showMessage('action-message', err.message);
  }
};

const loadBook = async () => {
  if (!bookId) {
    document.getElementById('book-detail').innerHTML = '';
    showMessage('page-message', 'No book was selected.');
    return;
  }
  try {
    const result = await apiRequest(`/books/${bookId}`);
    renderBook(result.data.book);
    renderOtherCopies(result.data.otherCopies);
  } catch (err) {
    document.getElementById('book-detail').innerHTML = '';
    showMessage('page-message', err.message);
  }
};

loadBook();
