// Creates the BookBay database, its tables, sample books and two sample accounts.
// Run with:  npm run db:setup
// WARNING: this deletes any existing BookBay data.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const sampleUsers = [
  { name: 'BookBay Admin', email: 'admin@bookbay.com', password: 'Admin@123', role: 'admin', address: null },
  { name: 'Sara Ahmed', email: 'sara@example.com', password: 'Customer@123', role: 'user', address: '12 Tahrir Street, Dokki, Giza, Egypt' },
];

const setup = async () => {
  // Connect without choosing a database, because it may not exist yet
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    multipleStatements: true, // allows running a whole .sql file at once
  });

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

    console.log('Creating tables...');
    await connection.query(schema);

    console.log('Adding sample books...');
    await connection.query(seed);

    console.log('Adding sample users...');
    for (const user of sampleUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role, address) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, passwordHash, user.role, user.address]
      );
    }

    console.log('Database is ready.');
    console.log('Admin login:    admin@bookbay.com / Admin@123');
    console.log('Customer login: sara@example.com / Customer@123');
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
};

setup();
