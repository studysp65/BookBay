const express = require('express');
const { register, login, logout, me } = require('../controllers/authController');
const { optionalAuth } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/security');
const { registerRules, loginRules, handleValidation } = require('../middleware/validators');

const authRouter = express.Router();

authRouter.post('/register', registerRules, handleValidation, register);
authRouter.post('/login', loginRateLimiter, loginRules, handleValidation, login);
authRouter.post('/logout', logout);
authRouter.get('/me', optionalAuth, me);

module.exports = authRouter;
