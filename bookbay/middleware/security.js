// General security middleware: HTTP headers, CSRF origin check and login rate limiting.
const { securityLog } = require('../utils/logger');

// Security headers sent with every response
const securityHeaders = (req, res, next) => {
  // Content Security Policy: the browser only runs scripts from our own site,
  // which blocks most XSS attacks. Book covers come from Open Library.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https://covers.openlibrary.org https://*.archive.org",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff'); // don't guess file types
  res.setHeader('X-Frame-Options', 'DENY'); // can't be put in an iframe (clickjacking)
  res.setHeader('Referrer-Policy', 'same-origin');
  if (req.secure) {
    // Tell the browser to always use HTTPS for this site from now on
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
};

// CSRF protection (together with SameSite=strict cookies):
// requests that change data must come from our own pages.
const checkOrigin = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  const origin = req.headers.origin;
  if (safeMethods.includes(req.method) || !origin) {
    return next();
  }

  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch (err) {
    originHost = '';
  }

  if (originHost !== req.headers.host) {
    securityLog('csrf_blocked', { origin, path: req.originalUrl, ip: req.ip });
    return res.status(403).json({ status: 'fail', message: 'Request blocked.' });
  }
  next();
};

// Login rate limit: at most 10 attempts per IP address every 15 minutes.
// Stops attackers from guessing passwords quickly (brute force).
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map(); // ip -> { count, firstAttempt }

const loginRateLimiter = (req, res, next) => {
  const now = Date.now();
  const record = loginAttempts.get(req.ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(req.ip, { count: 1, firstAttempt: now });
    return next();
  }

  record.count++;
  if (record.count > MAX_ATTEMPTS) {
    securityLog('login_rate_limited', { ip: req.ip });
    return res.status(429).json({
      status: 'fail',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    });
  }
  next();
};

// Called after a successful login so the user isn't locked out later
const resetLoginAttempts = (ip) => {
  loginAttempts.delete(ip);
};

module.exports = { securityHeaders, checkOrigin, loginRateLimiter, resetLoginAttempts };
