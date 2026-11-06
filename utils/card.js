// Checks used by the mock payment form. Nothing here stores card details.

const cleanCardNumber = (cardNumber) => String(cardNumber || '').replace(/[\s-]/g, '');

// Luhn algorithm: the checksum that every real card number passes.
// It catches typing mistakes such as one wrong digit.
const passesLuhn = (cardNumber) => {
  const digits = cleanCardNumber(cardNumber);
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let doubleIt = false;
  // Start from the right-most digit
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (doubleIt) {
      digit = digit * 2;
      if (digit > 9) digit = digit - 9;
    }
    sum += digit;
    doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
};

// expiry is "MM/YY". The card is valid until the end of that month.
const isExpiryValid = (expiry, today = new Date()) => {
  const match = /^(\d{2})\/(\d{2})$/.exec(String(expiry || '').trim());
  if (!match) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  // new Date(year, month, 1) is the first day of the NEXT month
  const firstDayAfterExpiry = new Date(year, month, 1);
  return today < firstDayAfterExpiry;
};

module.exports = { cleanCardNumber, passesLuhn, isExpiryValid };
