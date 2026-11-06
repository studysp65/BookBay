// Home page: browse, search and filter the catalogue.

const PAGE_SIZE = 12;
let currentPage = 1;

const bookCardHtml = (book) => {
  const outOfStock = book.stock <= 0;
  return `
    <article class="book-card">
      <a class="cover-link" href="/book?id=${book.id}">${coverImgHtml(book)}</a>
      <div class="card-body">
        <div>${conditionBadgeHtml(book.bookCondition)}</div>
        <a class="title" href="/book?id=${book.id}">${escapeHtml(book.title)}</a>
        <span class="author">${escapeHtml(book.author)}</span>
        <div class="price-row">
          <span class="price">${formatPrice(book.price)}</span>
          ${stockHtml(book.stock)}
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-small js-add-cart" data-id="${book.id}" ${outOfStock ? 'disabled' : ''}>
            ${outOfStock ? 'Out of Stock' : 'Add to cart'}
          </button>
          <button type="button" class="btn btn-small btn-outline js-wishlist" data-id="${book.id}" title="Save to wishlist" aria-label="Save to wishlist">♡</button>
        </div>
      </div>
    </article>`;
};

// Reads the filter form and turns it into "?q=...&genre=..." (empty fields are skipped)
const buildQueryString = () => {
  const formData = new FormData(document.getElementById('filter-form'));
  const params = new URLSearchParams();
  for (const [key, value] of formData.entries()) {
    if (String(value).trim() !== '') params.append(key, String(value).trim());
  }
  params.append('page', currentPage);
  params.append('limit', PAGE_SIZE);
  return params.toString();
};

const renderPagination = (page, totalPages) => {
  const container = document.getElementById('pagination');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <button type="button" class="btn btn-outline btn-small" id="prev-page" ${page <= 1 ? 'disabled' : ''}>← Previous</button>
    <span class="muted">Page ${page} of ${totalPages}</span>
    <button type="button" class="btn btn-outline btn-small" id="next-page" ${page >= totalPages ? 'disabled' : ''}>Next →</button>`;

  document.getElementById('prev-page').addEventListener('click', () => {
    currentPage--;
    loadBooks();
  });
  document.getElementById('next-page').addEventListener('click', () => {
    currentPage++;
    loadBooks();
  });
};

const loadBooks = async () => {
  const grid = document.getElementById('book-grid');
  const info = document.getElementById('results-info');
  showMessage('page-message', '');

  try {
    const result = await apiRequest('/books?' + buildQueryString());
    const { books, total, page, totalPages } = result.data;

    if (books.length === 0) {
      grid.innerHTML = '<div class="empty-state">No books match your search. Try different filters.</div>';
    } else {
      grid.innerHTML = books.map(bookCardHtml).join('');
      attachCoverFallbacks(grid);
    }
    info.textContent = `${total} ${total === 1 ? 'book' : 'books'} found`;
    renderPagination(page, totalPages);
  } catch (err) {
    grid.innerHTML = '';
    info.textContent = '';
    showMessage('page-message', err.message);
  }
};

const loadFilterOptions = async () => {
  try {
    const result = await apiRequest('/books/filters');
    const genreSelect = document.getElementById('genre');
    const authorSelect = document.getElementById('author');
    genreSelect.innerHTML += result.data.genres
      .map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`)
      .join('');
    authorSelect.innerHTML += result.data.authors
      .map((author) => `<option value="${escapeHtml(author)}">${escapeHtml(author)}</option>`)
      .join('');
  } catch (err) {
    // The page still works without the dropdown options
  }
};

// The preferred sort order is kept in a cookie by the server
const loadPreferences = async () => {
  try {
    const result = await apiRequest('/preferences');
    document.getElementById('sort').value = result.data.preferences.sort;
  } catch (err) {
    // Keep the default sort
  }
};

const loadRecentlyViewed = async () => {
  try {
    const result = await apiRequest('/books/recent');
    if (result.data.books.length === 0) return;
    const grid = document.getElementById('recent-grid');
    grid.innerHTML = result.data.books.map(bookCardHtml).join('');
    attachCoverFallbacks(grid);
    document.getElementById('recent-section').classList.remove('hidden');
  } catch (err) {
    // Not important enough to show an error
  }
};

// One click handler for every card button (event delegation)
const handleCardClick = async (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;

  const user = await userReady;
  if (!user) {
    goToLogin();
    return;
  }

  const bookId = Number(button.dataset.id);
  try {
    if (button.classList.contains('js-add-cart')) {
      const result = await apiRequest('/cart', { method: 'POST', body: { bookId, quantity: 1 } });
      showToast(result.message);
      refreshCartCount();
    } else if (button.classList.contains('js-wishlist')) {
      const result = await apiRequest('/wishlist', { method: 'POST', body: { bookId } });
      showToast(result.message);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

document.getElementById('filter-form').addEventListener('submit', (event) => {
  event.preventDefault();
  currentPage = 1;
  loadBooks();
});

document.getElementById('reset-filters').addEventListener('click', () => {
  const sort = document.getElementById('sort').value; // keep the saved sort order
  document.getElementById('filter-form').reset();
  document.getElementById('sort').value = sort;
  currentPage = 1;
  loadBooks();
});

document.getElementById('sort').addEventListener('change', async (event) => {
  currentPage = 1;
  loadBooks();
  try {
    await apiRequest('/preferences', { method: 'PUT', body: { sort: event.target.value } });
  } catch (err) {
    // Saving the preference is optional
  }
});

document.getElementById('book-grid').addEventListener('click', handleCardClick);
document.getElementById('recent-grid').addEventListener('click', handleCardClick);

const initHomePage = async () => {
  // A search typed somewhere else can be passed as /?q=...
  const q = getQueryParam('q');
  if (q) document.getElementById('q').value = q;

  await Promise.all([loadFilterOptions(), loadPreferences()]);
  loadBooks();
  loadRecentlyViewed();
};

initHomePage();
