const express = require('express');
const { getPreferences, updatePreferences } = require('../controllers/preferenceController');
const { preferenceRules, handleValidation } = require('../middleware/validators');

const preferenceRouter = express.Router();

preferenceRouter
  .route('/')
  .get(getPreferences)
  .put(preferenceRules, handleValidation, updatePreferences);

module.exports = preferenceRouter;
