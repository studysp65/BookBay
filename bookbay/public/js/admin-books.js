// Admin: add, edit and delete books, and update stock.

const ADMIN_PAGE_SIZE = 20;
let adminPage = 1;
let booksOnPage = []; // the books currently shown, used to fill the edit form

const formPanel = document.getElementById('book-form-panel');
const bookForm = document.getElementById('book-form');
const conditionSelect = document.getElementById('bookCondition');

// The condition note only makes sense for used copies
const updateConditionNoteField = () => {
  document.getElementById('condition-note-field').classList.toggle('hidden', conditionSelect.value === 'New');
};
conditionSelect.addEventListener('change', updateConditionNoteField);

const openForm = (book) => {
  bookForm.reset();
  showMessage('form-message', '');
  document.getElementById('book-id').value = book ? book.id : '';
  document.getElementById('book-form-title').textContent = book ? `Edit "${book.title}"` : 'Add a book';

  if (book) {
    document.getElementById('title').value = book.title;
    document.getElementById('author').value = book.author;
    document.getElementById('genre').value = book.genre;
    document.getElementById('isbn').value = book.isbn || '';
    document.getElementById('bookCondition').value = book.bookCondition;
    document.getElementById('conditionNote').value = book.conditionNote || '';
    document.getElementById('price').value = book.price;
    document.getElementById('stock').value = book.stock;
    document.getElementById('coverUrl').value = book.coverUrl || '';
    document.getElementById('description').value = book.description || '';
  }

  updateConditionNoteField();
  formPanel.classList.remove('hidden');
  formPanel.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('title').focus();
};

const closeForm = () => {
  formPanel.classList.add('hidden');
  bookForm.reset();
};

const renderBooksTable = (books) => {
  const tbody = document.getElementById('books-table');
  if (books.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No books found.</td></tr>';
    return;
  }

  tbody.innerHTML = books
    .map((book) => `
      <tr>
        <td>
          <div class="cell-book">
            ${coverImgHtml(book, 'thumb')}
            <div>
              <a href="/book?id=${book.id}">${escapeHtml(book.title)}</a>
              <div class="small muted">${escapeHtml(book.author)} · ${escapeHtml(book.genre)} · #${book.id}</div>
            </div>
          </div>
        </td>
        <td>
          ${conditionBadgeHtml(book.bookCondition)}
          ${book.conditionNote ? `<div class="small muted">${escapeHtml(book.conditionNote)}</div>` : ''}
        </td>
        <td class="price">${formatPrice(book.price)}</td>
        <td>
          <div class="row-actions">
            <input type="number" min="0" max="10000" step="1" value="${book.stock}" id="stock-${book.id}" aria-label="Stock for ${escapeHtml(book.title)}">
            <button type="button" class="btn btn-small btn-outline js-save-stock" data-id="${book.id}">Save</button>
          </div>
          ${book.stock <= 0 ? '<div class="small stock stock--out">Out of Stock</div>' : ''}
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn-small btn-outline js-edit" data-id="${book.id}">Edit</button>
            <button type="button" class="btn btn-small btn-danger js-delete" data-id="${book.id}">Delete</button>
          </div>
        </td>
      </tr>`)
    .join('');
  attachCoverFallbacks(tbody);
};

const renderAdminPagination = (page, totalPages) => {
  const container = document.getElementById('pagination');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <button type="button" class="btn btn-outline btn-small" id="prev-page" ${page <= 1 ? 'disabled' : ''}>← Previous</button>
    <span class="muted">Page ${page} of ${totalPages}</span>
    <button type="button" class="btn btn-outline btn-small" id="next-page" ${page >= totalPages ? 'disabled' : ''}>Next →</button>`;
  document.getElementById('prev-page').addEventListener('click', () => { adminPage--; loadAdminBooks(); });
  document.getElementById('next-page').addEventListener('click', () => { adminPage++; loadAdminBooks(); });
};

const loadAdminBooks = async () => {
  const params = new URLSearchParams({ page: adminPage, limit: ADMIN_PAGE_SIZE, sort: 'title' });
  const search = document.getElementById('admin-search').value.trim();
  if (search) params.append('q', search);

  try {
    const result = await apiRequest('/books?' + params.toString());
    booksOnPage = result.data.books;
    renderBooksTable(booksOnPage);
    renderAdminPagination(result.data.page, result.data.totalPages);
  } catch (err) {
    showMessage('page-message', err.message);
  }
};

const loadGenreSuggestions = async () => {
  try {
    const result = await apiRequest('/books/filters');
    document.getElementById('genre-list').innerHTML = result.data.genres
      .map((genre) => `<option value="${escapeHtml(genre)}"></option>`)
      .join('');
  } catch (err) {
    // Suggestions are optional
  }
};

// Save (add or edit)
bookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('save-book-button');
  const id = document.getElementById('book-id').value;

  const body = {
    title: document.getElementById('title').value.trim(),
    author: document.getElementById('author').value.trim(),
    genre: document.getElementById('genre').value.trim(),
    isbn: document.getElementById('isbn').value.trim(),
    bookCondition: document.getElementById('bookCondition').value,
    conditionNote: document.getElementById('conditionNote').value.trim(),
    price: document.getElementById('price').value,
    stock: document.getElementById('stock').value,
    coverUrl: document.getElementById('coverUrl').value.trim(),
    description: document.getElementById('description').value.trim(),
  };

  setLoading(button, true, 'Saving...');
  try {
    const result = id
      ? await apiRequest(`/books/${id}`, { method: 'PUT', body })
      : await apiRequest('/books', { method: 'POST', body });
    showToast(result.message);
    closeForm();
    loadAdminBooks();
    loadGenreSuggestions();
  } catch (err) {
    showMessage('form-message', err.message);
  } finally {
    setLoading(button, false);
  }
});

// Buttons inside the table (event delegation)
document.getElementById('books-table').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const id = Number(button.dataset.id);
  const book = booksOnPage.find((b) => b.id === id);

  if (button.classList.contains('js-edit')) {
    openForm(book);
    return;
  }

  if (button.classList.contains('js-save-stock')) {
    const stock = document.getElementById(`stock-${id}`).value;
    try {
      const result = await apiRequest(`/books/${id}/stock`, { method: 'PATCH', body: { stock } });
      showToast(result.message);
      loadAdminBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
    return;
  }

  if (button.classList.contains('js-delete')) {
    const ok = window.confirm(`Delete "${book ? book.title : 'this book'}"? It will also be removed from carts and wishlists. Past orders keep their details.`);
    if (!ok) return;
    try {
      const result = await apiRequest(`/books/${id}`, { method: 'DELETE' });
      showToast(result.message);
      loadAdminBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
});

document.getElementById('add-book-button').addEventListener('click', () => openForm(null));
document.getElementById('cancel-book-button').addEventListener('click', closeForm);
document.getElementById('admin-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  adminPage = 1;
  loadAdminBooks();
});

loadAdminBooks();
loadGenreSuggestions();
