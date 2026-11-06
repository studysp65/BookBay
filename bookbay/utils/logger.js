// Security logging: failed logins, blocked requests, admin actions...
// Each event is written as one JSON line to logs/security.log
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
const logFile = path.join(logDir, 'security.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const securityLog = (event, details = {}) => {
  const entry = { time: new Date().toISOString(), event, ...details };
  const line = JSON.stringify(entry);

  if (process.env.NODE_ENV !== 'test') {
    console.log('[security]', line);
  }

  fs.appendFile(logFile, line + '\n', (err) => {
    if (err) console.error('Could not write to security log:', err.message);
  });
};

module.exports = { securityLog };
