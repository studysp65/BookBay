// Everything to do with the login token and the cookie that carries it.
const jwt = require('jsonwebtoken');

const TOKEN_COOKIE = 'bb_token';

const signToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  });
};

// Returns the decoded token ({ id, role }) or null if it is missing, fake or expired
const decodeToken = (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { id: decoded.id, role: decoded.role };
  } catch (err) {
    return null;
  }
};

// Secure cookie settings required by the coursework:
// - httpOnly: JavaScript in the browser cannot read the cookie (protects against XSS)
// - secure: only sent over HTTPS (switched on when USE_HTTPS=true)
// - sameSite 'strict': not sent with requests from other websites (protects against CSRF)
// - maxAge: the cookie expires together with the token
const tokenCookieOptions = () => {
  const hours = Number(process.env.COOKIE_MAX_AGE_HOURS) || 2;
  return {
    httpOnly: true,
    secure: process.env.USE_HTTPS === 'true',
    sameSite: 'strict',
    maxAge: hours * 60 * 60 * 1000,
    path: '/',
  };
};

// Simple cookie header parser, used by Socket.IO (which doesn't go through cookie-parser)
const parseCookieHeader = (header) => {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch (err) {
      cookies[name] = value;
    }
  }
  return cookies;
};

module.exports = {
  TOKEN_COOKIE,
  signToken,
  decodeToken,
  tokenCookieOptions,
  parseCookieHeader,
};
