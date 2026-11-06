# BookBay

BookBay is an online bookstore where people can buy **new and used books in one place**. Every used copy is listed by the store admin as its own item, with a condition grade (Like New, Very Good, Good or Acceptable), its own price and a short note about what is wrong with it, so buyers know exactly what they are paying for.

Customers can sign up, browse and search the catalogue, filter by author, genre, condition and price, keep a wishlist, add books to a cart and check out with a simulated card payment. After ordering, they can follow the order on a tracking page that **updates live over WebSockets** when the admin changes the status (Pending → Paid → Processing → Shipped → Delivered, or Cancelled).

The admin can add, edit and delete books, update stock, see every order with its payment status, and move orders through their statuses.

Built for the KH5041CMD Internet & Web Technologies coursework.

---

## Technology

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, plain JavaScript (`fetch()` to call the JSON API) |
| Backend | Node.js + Express 5 |
| Database | MySQL 8 |
| Real-time updates | Socket.IO (WebSockets) |
| Authentication | bcryptjs (password hashing) + JSON Web Tokens in secure HttpOnly cookies |
| Validation | express-validator |

### Third-party plugins (npm packages)

| Package | What it is used for |
|---|---|
| `express` | Web server, routing and middleware |
| `mysql2` | Connecting to MySQL with prepared statements and transactions |
| `socket.io` | WebSockets for live order tracking |
| `bcryptjs` | Hashing passwords |
| `jsonwebtoken` | Creating and checking login tokens |
| `cookie-parser` | Reading cookies from requests |
| `express-validator` | Server-side input validation |
| `dotenv` | Loading settings from the `.env` file |
| `nodemon` (dev only) | Restarting the server automatically while developing |

Book cover images come from the free [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers).

---

## How to run BookBay

### 1. Install the requirements

- [Node.js](https://nodejs.org/) 18 or newer
- [MySQL 8](https://dev.mysql.com/downloads/) (MySQL Community Server). Remember the root password you choose.

### 2. Install the packages

```bash
npm install
```

### 3. Create your `.env` file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env        # Windows (Command Prompt): copy .env.example .env
```

Then open `.env` and set at least:

- `DB_PASSWORD` – your MySQL password
- `JWT_SECRET` – a long random string. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 4. Create and fill the database

```bash
npm run db:setup
```

This runs `database/schema.sql` (creates the `bookbay` database and tables), `database/seed.sql` (20 sample books) and adds two sample accounts. **It deletes any existing BookBay data**, so you can run it again whenever you want a fresh start.

### 5. Start the server

```bash
npm run dev      # restarts automatically when you change a file
# or
npm start
```

### 6. Open it in the browser

Go to **http://localhost:3000**

### Sample accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bookbay.com` | `Admin@123` |
| Customer | `sara@example.com` | `Customer@123` |

### Test cards (simulated payment)

| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment is declined |

Use any future expiry date (for example `12/29`) and any 3-digit CVV. The card number and CVV are never stored.

### Trying the live order tracking

1. Log in as Sara in one browser and place an order. Open **My orders → View & track**.
2. Log in as the admin in a **different browser** (or a private window). Go to **Manage orders**, open the order and change its status.
3. Sara's tracking page updates straight away without refreshing.

### Running the unit tests

```bash
npm test
```

The tests use Node's built-in test runner and don't need the database.

---

## Running with HTTPS

1. Create a self-signed certificate (OpenSSL comes with Git Bash on Windows):

   ```bash
   mkdir certs
   openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"
   ```

2. In `.env` set `USE_HTTPS=true`.
3. Restart the server and open **https://localhost:3443**. Your browser will warn that the certificate is self-signed; choose to continue.

With HTTPS on, cookies get the `Secure` flag, the server sends `Strict-Transport-Security`, WebSockets run over `wss://`, and `http://localhost:3000` redirects to HTTPS.

## Using a cloud database

Any hosted MySQL 8 service (for example Aiven, Railway or AWS RDS) works. Put its host, port, user and password in `.env`, set `DB_SSL=true`, and run `npm run db:setup` once. The app then saves and reads users, books, carts and orders from the cloud.

---

## Project structure (MVC + services)

```
bookbay/
├── server.js               Entry point: loads .env, checks MySQL, starts HTTP/HTTPS + Socket.IO
├── index.js                Creates the Express app and connects middleware and routes
├── config/
│   ├── db.js               MySQL connection pool
│   └── socket.js           Socket.IO setup (live order updates)
├── models/                 MODEL: all SQL queries
│   ├── userModel.js  bookModel.js  wishlistModel.js  cartModel.js  orderModel.js
├── services/               Business logic used by several controllers
│   ├── checkoutService.js  Cart check, server-side total, stock reservation, payment
│   ├── orderService.js     Status changes, cancelling + restocking, live update
│   └── paymentService.js   Mock payment
├── controllers/            CONTROLLER: handle requests and send responses
├── routes/                 URL + HTTP method -> middleware -> controller
├── middleware/
│   ├── auth.js             verifyToken, verifyAdmin, page guards
│   ├── validators.js       express-validator rules
│   ├── security.js         Security headers, CSRF origin check, login rate limit
│   └── errorHandler.js     404 and error responses
├── utils/                  Small helpers (tokens, transactions, cart maths, card checks, logging)
├── views/                  VIEW: HTML pages (admin pages in views/admin/)
├── public/                 CSS, page scripts and images
├── database/               schema.sql, seed.sql, setup.js
└── tests/                  Unit tests (node:test)
```

### Design patterns used

- **MVC** – models (SQL), views (HTML pages), controllers (request handling).
- **Service layer** – `CheckoutService` and `OrderService` hold the business rules so controllers stay small.
- **Middleware / chain of responsibility** – each request passes through security headers, validation, authentication and authorisation before reaching the controller.
- **Observer (publish/subscribe)** – Socket.IO rooms: tracking pages subscribe to `order:<id>` and the server publishes status changes.
- **Singleton** – one shared MySQL connection pool and one Socket.IO server.
- **State machine** – `utils/orderStatus.js` defines which status changes are allowed.

## Security features

- Passwords hashed with bcrypt, strong password policy
- JWT stored in a cookie with `HttpOnly`, `SameSite=Strict`, `Secure` (over HTTPS) and an expiry time
- No sensitive data in cookies (preference and recently-viewed cookies only hold a sort option and book ids)
- Prepared statements for every SQL query (no SQL injection)
- Server-side validation of every input with express-validator
- Role checks on every admin API route and admin page; ownership checks on orders and accounts
- Prices and totals always recalculated on the server; stock reserved inside a database transaction with row locks
- Card number and CVV never stored – only the payment status, payment reference and last 4 digits
- Content Security Policy, `X-Frame-Options`, `nosniff` and other security headers
- CSRF protection with `SameSite=Strict` plus an `Origin` check on requests that change data
- Login rate limiting (10 attempts per 15 minutes per IP)
- Security log (`logs/security.log`) for logins, failed logins, blocked requests and admin actions
- HTML escaping on every page to prevent XSS

## API overview

All responses are JSON in the form `{ "status": "success" | "fail" | "error", "message", "data" }`.

| Method | URL | Who |
|---|---|---|
| POST | `/api/v1/auth/register` · `/login` · `/logout` | Anyone |
| GET | `/api/v1/auth/me` | Anyone |
| GET / PUT | `/api/v1/account` | Customer |
| GET | `/api/v1/books` (`?q=&genre=&author=&condition=&minPrice=&maxPrice=&sort=&page=`) | Anyone |
| GET | `/api/v1/books/filters` · `/books/recent` · `/books/:id` | Anyone |
| POST / PUT / DELETE | `/api/v1/books` · `/books/:id` | Admin |
| PATCH | `/api/v1/books/:id/stock` | Admin |
| GET / POST / DELETE | `/api/v1/wishlist` · `/wishlist/:bookId` | Customer |
| POST | `/api/v1/wishlist/:bookId/move-to-cart` | Customer |
| GET / POST / PATCH / DELETE | `/api/v1/cart` · `/cart/count` · `/cart/:bookId` | Customer |
| POST | `/api/v1/checkout` · `/checkout/:orderId/pay` | Customer |
| GET | `/api/v1/orders` · `/orders/:id` | Customer (own orders only) |
| GET | `/api/v1/admin/orders` · `/admin/orders/:id` | Admin |
| PATCH | `/api/v1/admin/orders/:id/status` | Admin |
| GET / PUT | `/api/v1/preferences` | Anyone |

WebSocket events: the browser sends `order:watch` (order id); the server sends `order:status` to that order's room and `order:updated` to admins.
