const express = require('express');
const { getAccount, updateAccount } = require('../controllers/accountController');
const { verifyToken } = require('../middleware/auth');
const { accountRules, handleValidation } = require('../middleware/validators');

const accountRouter = express.Router();

// Every account route needs a logged-in user
accountRouter.use(verifyToken);

accountRouter
  .route('/')
  .get(getAccount)
  .put(accountRules, handleValidation, updateAccount);

module.exports = accountRouter;
