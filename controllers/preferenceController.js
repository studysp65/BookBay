// Preference controller: stores the customer's preferred sort order in a cookie,
// so the catalogue opens the way they like it next time.
const { matchedData } = require('express-validator');

const PREF_COOKIE = 'bb_prefs';
const DEFAULT_PREFERENCES = { sort: 'newest' };

const prefCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.USE_HTTPS === 'true',
  sameSite: 'strict',
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  path: '/',
});

const readPreferences = (req) => {
  try {
    const saved = JSON.parse(req.cookies[PREF_COOKIE] || '{}');
    return { ...DEFAULT_PREFERENCES, ...saved };
  } catch (err) {
    return { ...DEFAULT_PREFERENCES }; // cookie was edited or broken
  }
};

// GET /api/v1/preferences
const getPreferences = (req, res) => {
  res.status(200).json({ status: 'success', data: { preferences: readPreferences(req) } });
};

// PUT /api/v1/preferences  { sort }
const updatePreferences = (req, res) => {
  const { sort } = matchedData(req);
  const preferences = { ...readPreferences(req), sort };
  res.cookie(PREF_COOKIE, JSON.stringify(preferences), prefCookieOptions());
  res.status(200).json({ status: 'success', data: { preferences } });
};

module.exports = { getPreferences, updatePreferences };
