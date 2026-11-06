// Shared helpers used by every page.
// apiRequest() talks to our JSON API. The login cookie is sent automatically
// by the browser, so no token is ever handled in JavaScript.

const API_BASE = '/api/v1';

const goToLogin = () => {
  const next = window.location.pathname + window.location.search;
  window.location.href = '/login?next=' + encodeURIComponent(next);
};

// options: { method, body, redirectOn401 }
const apiRequest = async (path, options = {}) => {
  const fetchOptions = {
    method: options.method || 'GET',
    headers: {},
    credentials: 'same-origin',
  };
  if (options.body !== undefined) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, fetchOptions);
  } catch (err) {
    throw new Error('Cannot reach the server. Please check your connection.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  // Session expired or not logged in: send the user to the login page
  if (response.status === 401 && options.redirectOn401 !== false) {
    goToLogin();
  }

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
};

// ---------- Display helpers ----------

// ALWAYS use this before putting data into innerHTML. It turns characters like
// < and > into harmless text, so a book title can't inject HTML or scripts (XSS).
const escapeHtml = (value) => {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const priceFormatter = new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' });
const formatPrice = (amount) => priceFormatter.format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const getQueryParam = (name) => new URLSearchParams(window.location.search).get(name);

// Book cover: the admin's cover URL, otherwise Open Library's free cover by ISBN
const NO_COVER = '/images/no-cover.svg';
const coverSrc = (book) => {
  if (book.coverUrl) return book.coverUrl;
  if (book.isbn) {
    const isbn = String(book.isbn).replace(/[^0-9Xx]/g, '');
    return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-M.jpg?default=false`;
  }
  return NO_COVER;
};

const coverImgHtml = (book, className = 'cover') => {
  return `<img class="${className}" src="${escapeHtml(coverSrc(book))}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy">`;
};

// Replaces covers that failed to load with the placeholder.
// (Inline onerror="" handlers are blocked by our Content Security Policy.)
const attachCoverFallbacks = (root = document) => {
  root.querySelectorAll('img.cover, img.thumb').forEach((img) => {
    const useFallback = () => {
      if (!img.src.endsWith(NO_COVER)) img.src = NO_COVER;
    };
    img.addEventListener('error', useFallback);
    if (img.complete && img.naturalWidth === 0) useFallback(); // already failed
  });
};

const conditionBadgeHtml = (condition) => {
  if (condition === 'New') return '<span class="badge badge--new">New</span>';
  return `<span class="badge badge--used">Used · ${escapeHtml(condition)}</span>`;
};

const stockHtml = (stock) => {
  if (stock <= 0) return '<span class="stock stock--out">Out of Stock</span>';
  if (stock <= 2) return `<span class="stock stock--low">Only ${stock} left</span>`;
  return '<span class="stock stock--in">In stock</span>';
};

const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  unpaid: 'Unpaid',
  failed: 'Failed',
  refunded: 'Refunded',
};

const statusHtml = (status) => {
  return `<span class="status status--${escapeHtml(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span>`;
};

// Shows a message inside an element such as <div id="form-message">
const showMessage = (elementId, text, type = 'error') => {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!text) {
    el.className = 'hidden';
    el.textContent = '';
    return;
  }
  el.className = `message message--${type}`;
  el.textContent = text;
};

// Small pop-up message in the corner
let toastTimer = null;
const showToast = (text, type = 'success') => {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.className = `toast toast--${type}`;
  toast.textContent = text;
  // Force the browser to apply the class before adding "show" (for the animation)
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
};

// Disables a button while a request is running so it can't be clicked twice
const setLoading = (button, isLoading, loadingText = 'Please wait...') => {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
};
