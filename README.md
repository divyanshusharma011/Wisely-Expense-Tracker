# Wisely — Smart Personal Finance & Expense Tracker

> Phase 1 complete. A full-stack personal finance web application built with vanilla HTML/CSS/JS on the frontend and Node.js + Express + SQLite on the backend.

---

## What is Wisely?

Wisely helps you track every rupee — log income and expenses, set monthly budgets, create savings goals, and visualise your financial health through live charts and analytics. Everything is tied to your account in a real database.

---

## Live Demo

Start the server and open your browser:

```
http://localhost:5000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Charts | Chart.js 4 (CDN) |
| Backend | Node.js 18+, Express 4 |
| Database | SQLite via sql.js (pure JS, no native compilation) |
| Auth | JWT (jsonwebtoken) + bcryptjs password hashing |
| Styling | CSS custom properties, responsive grid/flexbox |

---

## Project Structure

```
Wisely/
├── client/                     # All frontend files
│   ├── pages/
│   │   ├── index.html          # Landing page
│   │   ├── login.html          # Login
│   │   ├── signup.html         # Registration
│   │   └── dashboard.html      # Main app
│   ├── css/
│   │   ├── style.css           # Landing page styles
│   │   └── auth.css            # Login / signup styles
│   ├── js/
│   │   ├── api.js              # API client (WiselyAuth, TransactionAPI, DashboardAPI, BudgetAPI, SavingsAPI)
│   │   ├── auth.js             # Login / signup form logic
│   │   └── script.js           # Landing page interactivity
│   └── assets/
│       ├── dashboard-preview.png
│       ├── dashboard-preview.webp
│       └── logo/wisely-logo.png
│
├── server/                     # All backend files
│   ├── config/
│   │   └── config.js           # Central config (port, JWT, bcrypt, CORS)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── transactions.controller.js
│   │   ├── budgets.controller.js
│   │   ├── savings.controller.js
│   │   └── dashboard.controller.js
│   ├── db/
│   │   ├── schema.sql          # SQLite schema (4 tables)
│   │   ├── database.js         # sql.js singleton + persist()
│   │   └── wisely.db           # SQLite database file (auto-created)
│   ├── middleware/
│   │   ├── auth.middleware.js  # JWT protect()
│   │   └── validate.middleware.js  # Request body validation
│   └── routes/
│       ├── auth.routes.js
│       ├── transactions.routes.js
│       ├── budgets.routes.js
│       ├── savings.routes.js
│       └── dashboard.routes.js
│
├── server.js                   # Entry point — Express app + static file serving
├── package.json
├── .env                        # Environment variables (not committed)
├── .gitignore
├── README.md
└── DOCUMENTATION.md            # Full Phase 1 technical documentation
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
node server.js
```

Or with auto-restart on file changes (Node 18+):

```bash
node --watch server.js
```

### 3. Open in browser

```
http://localhost:5000
```

The server serves both the API and the frontend from the same port. No separate dev server needed.

---

## API Endpoints

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login, receive JWT |
| POST | `/api/auth/logout` | Yes | Logout (stateless) |
| GET | `/api/auth/me` | Yes | Get current user |

### Transactions
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/transactions` | Yes | List + filter + summary |
| POST | `/api/transactions` | Yes | Create transaction |
| PUT | `/api/transactions/:id` | Yes | Update transaction |
| DELETE | `/api/transactions/:id` | Yes | Delete transaction |

### Budgets
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/budgets` | Yes | List with spending enrichment |
| POST | `/api/budgets` | Yes | Create budget |
| PUT | `/api/budgets/:id` | Yes | Update budget |
| DELETE | `/api/budgets/:id` | Yes | Delete budget |

### Savings Goals
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/savings` | Yes | List goals |
| POST | `/api/savings` | Yes | Create goal |
| PUT | `/api/savings/:id` | Yes | Update goal |
| DELETE | `/api/savings/:id` | Yes | Delete goal |

### Dashboard
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Yes | Income/expenses/balance totals |
| GET | `/api/dashboard/category-breakdown` | Yes | Expense breakdown by category |
| GET | `/api/dashboard/monthly-flow` | Yes | Month-by-month income vs expense |
| GET | `/api/dashboard/recent-transactions` | Yes | Filtered/sorted transaction list |

All dashboard endpoints accept `?period=this_month|last_month|this_year|all|custom&start=YYYY-MM-DD&end=YYYY-MM-DD`.

---

## Environment Variables

Create a `.env` file at the project root:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
JWT_REMEMBER_IN=30d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

---

## Database

SQLite file is auto-created at `server/db/wisely.db` on first run. The schema is applied via `server/db/schema.sql` every startup (all `CREATE TABLE IF NOT EXISTS` — safe to run repeatedly).

To reset the database:
```bash
del server\db\wisely.db
node server.js
```

---

## Security Notes

- Passwords are hashed with bcrypt (12 salt rounds)
- JWTs are verified on every protected request
- `user_id` is always derived from the JWT — never trusted from the request body
- Passwords are never returned in API responses
- `wisely.db` and `.env` are in `.gitignore`

---

## Roadmap — Phase 2

- [ ] Recurring transactions
- [ ] Multiple savings goals with progress tracking
- [ ] Export to CSV / PDF
- [ ] Email notifications (budget alerts)
- [ ] Mobile app (React Native)
- [ ] Multi-currency support

---

## License

ISC
