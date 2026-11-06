// Account page: view and update name, email, delivery address and password.

const accountForm = document.getElementById('account-form');

const fillAccountForm = (user) => {
  document.getElementById('name').value = user.name;
  document.getElementById('email').value = user.email;
  document.getElementById('address').value = user.address || '';
  document.getElementById('account-info').textContent =
    `Member since ${new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}` +
    (user.role === 'admin' ? ' · Administrator' : '');
};

const loadAccount = async () => {
  try {
    const result = await apiRequest('/account');
    fillAccountForm(result.data.user);
  } catch (err) {
    showMessage('form-message', err.message);
  }
};

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = accountForm.querySelector('button[type="submit"]');

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  if (newPassword && newPassword !== confirmPassword) {
    showMessage('form-message', 'The new passwords do not match.');
    return;
  }

  const body = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('address').value.trim(),
    currentPassword: document.getElementById('currentPassword').value,
    newPassword,
  };

  setLoading(button, true, 'Saving...');
  try {
    const result = await apiRequest('/account', { method: 'PUT', body });
    fillAccountForm(result.data.user);
    // Clear the password boxes after a successful save
    ['currentPassword', 'newPassword', 'confirmPassword'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    showMessage('form-message', result.message, 'success');
  } catch (err) {
    showMessage('form-message', err.message);
  } finally {
    setLoading(button, false);
  }
});

loadAccount();
