// Entry point: loads settings, checks the database and starts the server.
// Load .env first, before any other file reads process.env
require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const { app } = require('./index.js');
const { pool } = require('./config/db');
const { initSocket } = require('./config/socket');

const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const start = async () => {
  // Make sure we can reach MySQL before accepting requests
  try {
    await pool.query('SELECT 1');
    console.log('Connected to MySQL');
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message);
    console.error('Check the DB_ settings in your .env file and that MySQL is running.');
    process.exit(1);
  }

  if (USE_HTTPS) {
    // HTTPS server with a certificate (see README: "Running with HTTPS")
    const options = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
    const httpsServer = https.createServer(options, app);
    initSocket(httpsServer); // WebSockets run over the same secure server (wss://)
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`BookBay is running on https://localhost:${HTTPS_PORT}`);
    });

    // A plain HTTP server that only redirects everyone to HTTPS
    http
      .createServer((req, res) => {
        const host = (req.headers.host || 'localhost').split(':')[0];
        res.writeHead(301, { Location: `https://${host}:${HTTPS_PORT}${req.url}` });
        res.end();
      })
      .listen(PORT, () => {
        console.log(`HTTP requests on port ${PORT} are redirected to HTTPS`);
      });
  } else {
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`BookBay is running on http://localhost:${PORT}`);
    });
  }
};

start();
