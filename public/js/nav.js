// Builds the header on every page and finds out who is logged in.
// Page scripts can wait for the user with:  const user = await userReady;

let currentUser = null;

const navLink = (href, text, extraClass = '') => {
  const active = window.location.pathname === href ? ' active' : '';
  return `<a href="${href}" class="${extraClass}${active}">${text}</a>`;
};

const renderHeader = () => {
  const header = document.getElementById('site-header');
  if (!header) return;

  let links = navLink('/', 'Browse');

  if (currentUser) {
    links += navLink('/wishlist', 'Wishlist');
    links += navLink('/cart', 'Cart <span class="cart-badge" id="cart-count">0</span>');
    links += navLink('/orders', 'My orders');
    links += navLink('/account', 'Account');
    if (currentUser.role === 'admin') {
      links += '<span class="divider"></span>';
      links += navLink('/admin/books', 'Manage books', 'nav-admin');
      links += navLink('/admin/orders', 'Manage orders', 'nav-admin');
    }
    links += '<button type="button" id="logout-button">Log out</button>';
  } else {
    links += navLink('/login', 'Log in');
    links += navLink('/register', 'Sign up');
  }

  header.innerHTML = `
    <div class="container header-inner">
      <a class="logo" href="/">Book<span>Bay</span></a>
      <nav class="nav" aria-label="Main">${links}</nav>
    </div>`;

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } finally {
        window.location.href = '/';
      }
    });
  }
};

const refreshCartCount = async () => {
  const badge = document.getElementById('cart-count');
  if (!badge || !currentUser) return;
  try {
    const result = await apiRequest('/cart/count');
    badge.textContent = result.data.count;
  } catch (err) {
    badge.textContent = '0';
  }
};

const loadCurrentUser = async () => {
  try {
    const result = await apiRequest('/auth/me', { redirectOn401: false });
    currentUser = result.data.user;
  } catch (err) {
    currentUser = null;
  }
  renderHeader();
  refreshCartCount();
  return currentUser;
};

const userReady = loadCurrentUser();
