// Checkout page (use case UC-08)
// Step 1: confirm address -> POST /checkout          (server reserves stock, order "pending")
// Step 2: pay             -> POST /checkout/:id/pay  (order "paid" or "cancelled")

let pendingOrder = null; // { orderId, total, items } from step 1

const STEPS = ['step-address', 'step-payment', 'step-done', 'step-failed'];
const showStep = (stepId) => {
  STEPS.forEach((id) => document.getElementById(id).classList.toggle('hidden', id !== stepId));
  window.scrollTo(0, 0);
};

const loadSummary = async () => {
  try {
    const [cartResult, accountResult] = await Promise.all([apiRequest('/cart'), apiRequest('/account')]);
    const cart = cartResult.data;

    if (cart.items.length === 0) {
      showMessage('page-message', 'Your cart is empty. Add some books before checking out.', 'info');
      return;
    }
    if (cart.problems.length > 0) {
      showMessage('page-message', 'Some books in your cart are no longer available in that quantity. Please update your cart first.');
      return;
    }

    document.getElementById('summary-items').innerHTML = cart.items
      .map((item) => `
        <li>
          <span>${escapeHtml(item.title)} <span class="small muted">(${escapeHtml(item.bookCondition)}) × ${item.quantity}</span></span>
          <span>${formatPrice(item.lineTotal)}</span>
        </li>`)
      .join('');
    document.getElementById('summary-total').textContent = formatPrice(cart.total);

    // Pre-fill the address saved on the account page
    document.getElementById('address').value = accountResult.data.user.address || '';
    showStep('step-address');
  } catch (err) {
    showMessage('page-message', err.message);
  }
};

// Step 1: address submitted
document.getElementById('address-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.target.querySelector('button[type="submit"]');
  const address = document.getElementById('address').value.trim();

  // Alternative flow 3a: no address
  if (!address) {
    showMessage('address-message', 'Please enter a delivery address.');
    return;
  }

  setLoading(button, true, 'Reserving your books...');
  try {
    const result = await apiRequest('/checkout', { method: 'POST', body: { address } });
    pendingOrder = result.data;
    document.getElementById('payment-order-number').textContent = '#' + pendingOrder.orderId;
    document.getElementById('payment-total').textContent = formatPrice(pendingOrder.total);
    showMessage('payment-message', '');
    showStep('step-payment');
  } catch (err) {
    // Alternative flow 5a: not enough stock (message lists the books)
    showMessage('address-message', err.message);
  } finally {
    setLoading(button, false);
  }
});

// Formats the card number as "4242 4242 4242 4242" while typing
document.getElementById('cardNumber').addEventListener('input', (event) => {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 19);
  event.target.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
});

// Adds the "/" in the expiry date automatically
document.getElementById('expiry').addEventListener('input', (event) => {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
  event.target.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
});

// Step 2: payment submitted
document.getElementById('payment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingOrder) return;
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');

  const body = {
    cardName: document.getElementById('cardName').value.trim(),
    cardNumber: document.getElementById('cardNumber').value,
    expiry: document.getElementById('expiry').value.trim(),
    cvv: document.getElementById('cvv').value.trim(),
  };

  setLoading(button, true, 'Processing payment...');
  try {
    const result = await apiRequest(`/checkout/${pendingOrder.orderId}/pay`, { method: 'POST', body });
    const paid = result.data;

    document.getElementById('done-order-number').textContent = '#' + paid.orderId;
    document.getElementById('done-payment-ref').textContent = paid.paymentRef;
    document.getElementById('done-last4').textContent = paid.cardLast4;
    document.getElementById('done-total').textContent = formatPrice(paid.total);
    document.getElementById('track-link').href = `/order?id=${paid.orderId}`;
    form.reset(); // don't leave card details on the page
    refreshCartCount();
    showStep('step-done');
  } catch (err) {
    if (err.status === 400) {
      // Typing mistake (e.g. wrong expiry format): let them fix it and try again
      showMessage('payment-message', err.message);
    } else {
      // 402 = declined, 409 = order no longer pending: the order is cancelled
      form.reset();
      document.getElementById('failed-message').textContent = err.message;
      showStep('step-failed');
    }
  } finally {
    setLoading(button, false);
  }
});

document.getElementById('try-again').addEventListener('click', () => {
  pendingOrder = null;
  loadSummary();
});

userReady.then(loadSummary);
