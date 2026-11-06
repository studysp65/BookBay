// Login and sign-up pages.

// Only allow redirects to pages on our own site (stops "open redirect" tricks
// like /login?next=https://evil.example)
const safeNextUrl = (fallback) => {
  const next = getQueryParam('next');
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
    return next;
  }
  return fallback;
};

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button[type="submit"]');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showMessage('form-message', 'Please enter your email and password.');
      return;
    }

    setLoading(button, true, 'Logging in...');
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
        redirectOn401: false, // 401 here just means wrong password
      });
      const user = result.data.user;
      window.location.href = safeNextUrl(user.role === 'admin' ? '/admin/orders' : '/');
    } catch (err) {
      showMessage('form-message', err.message);
      setLoading(button, false);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = registerForm.querySelector('button[type="submit"]');
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Quick checks in the browser for a better experience.
    // The server checks everything again, because browser checks can be skipped.
    if (!name || !email || !password) {
      showMessage('form-message', 'Please fill in all the fields.');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('form-message', 'The two passwords do not match.');
      return;
    }

    setLoading(button, true, 'Creating account...');
    try {
      await apiRequest('/auth/register', { method: 'POST', body: { name, email, password } });
      window.location.href = safeNextUrl('/');
    } catch (err) {
      showMessage('form-message', err.message);
      setLoading(button, false);
    }
  });
}
