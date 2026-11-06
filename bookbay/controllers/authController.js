// Auth controller: sign up, log in, log out and "who am I".
const bcrypt = require('bcryptjs');
const { matchedData } = require('express-validator');
const userModel = require('../models/userModel');
const { TOKEN_COOKIE, signToken, tokenCookieOptions } = require('../utils/tokens');
const { resetLoginAttempts } = require('../middleware/security');
const { securityLog } = require('../utils/logger');
const AppError = require('../utils/AppError');

// Puts the token in a secure HttpOnly cookie instead of sending it to JavaScript
const sendLoginCookie = (res, user) => {
  const token = signToken(user);
  res.cookie(TOKEN_COOKIE, token, tokenCookieOptions());
};

// POST /api/v1/auth/register
const register = async (req, res) => {
  const { name, email, password } = matchedData(req);

  const existing = await userModel.findByEmailWithPassword(email);
  if (existing) {
    throw new AppError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = await userModel.createUser({ name, email, passwordHash });
  const user = await userModel.findById(id);

  securityLog('user_registered', { userId: id, ip: req.ip });
  sendLoginCookie(res, user);

  res.status(201).json({
    status: 'success',
    message: 'Registration successful',
    data: { user },
  });
};

// POST /api/v1/auth/login
const login = async (req, res) => {
  const { email, password } = matchedData(req);

  const user = await userModel.findByEmailWithPassword(email);
  // Same message whether the email or the password is wrong,
  // so attackers can't find out which emails have accounts.
  const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!isMatch) {
    securityLog('login_failed', { email, ip: req.ip });
    throw new AppError(401, 'Invalid email or password.');
  }

  resetLoginAttempts(req.ip);
  securityLog('login_success', { userId: user.id, ip: req.ip });
  sendLoginCookie(res, user);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
  });
};

// POST /api/v1/auth/logout
const logout = (req, res) => {
  // The cookie must be cleared with the same options it was set with
  const { maxAge, ...options } = tokenCookieOptions();
  res.clearCookie(TOKEN_COOKIE, options);
  res.status(200).json({ status: 'success', message: 'Logged out' });
};

// GET /api/v1/auth/me  (guests get user: null)
const me = async (req, res) => {
  let user = null;
  if (req.user) {
    user = await userModel.findById(req.user.id);
  }
  res.status(200).json({ status: 'success', data: { user } });
};

module.exports = { register, login, logout, me };
