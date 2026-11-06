// Authentication and authorisation middleware.
// The login token (JWT) is kept in an HttpOnly cookie, not in localStorage,
// so JavaScript running in the page can never read or steal it.
const path = require('path');
const { TOKEN_COOKIE, decodeToken } = require('../utils/tokens');
const { securityLog } = require('../utils/logger');

// --- For API routes (they answer with JSON) ---

const verifyToken = (req, res, next) => {
  const user = decodeToken(req.cookies[TOKEN_COOKIE]);
  if (!user) {
    return res.status(401).json({ status: 'fail', message: 'Please log in to continue.' });
  }
  req.user = user; // { id, role }
  next();
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      securityLog('admin_access_denied', { userId: req.user.id, path: req.originalUrl, ip: req.ip });
      return res.status(403).json({ status: 'fail', message: 'Access denied: admins only.' });
    }
    next();
  });
};

// Sets req.user if the visitor is logged in, but lets guests through too
const optionalAuth = (req, res, next) => {
  req.user = decodeToken(req.cookies[TOKEN_COOKIE]);
  next();
};

// --- For page routes (they redirect instead of sending JSON) ---

const requireLoginPage = (req, res, next) => {
  const user = decodeToken(req.cookies[TOKEN_COOKIE]);
  if (!user) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  req.user = user;
  next();
};

const requireAdminPage = (req, res, next) => {
  requireLoginPage(req, res, () => {
    if (req.user.role !== 'admin') {
      securityLog('admin_page_denied', { userId: req.user.id, path: req.originalUrl, ip: req.ip });
      return res.status(403).sendFile(path.join(__dirname, '..', 'views', '403.html'));
    }
    next();
  });
};

module.exports = {
  verifyToken,
  verifyAdmin,
  optionalAuth,
  requireLoginPage,
  requireAdminPage,
};
