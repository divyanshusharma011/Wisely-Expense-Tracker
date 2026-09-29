# Wisely — Phase 1 Technical Documentation

> Complete technical reference for the Wisely personal finance tracker.
> Status: Phase 1 complete.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Backend — API Reference](#4-backend--api-reference)
5. [Frontend — Page Reference](#5-frontend--page-reference)
6. [Authentication Flow](#6-authentication-flow)
7. [Frontend API Client (api.js)](#7-frontend-api-client-apijs)
8. [Dashboard Data Flow](#8-dashboard-data-flow)
9. [Period Filtering System](#9-period-filtering-system)
10. [Transaction System](#10-transaction-system)
11. [Budget System](#11-budget-system)
12. [Savings Goals System](#12-savings-goals-system)
13. [Analytics & Charts](#13-analytics--charts)
14. [UI States Reference](#14-ui-states-reference)
15. [Responsive Breakpoints](#15-responsive-breakpoints)
16. [Folder Structure](#16-folder-structure)
17. [Environment & Configuration](#17-environment--configuration)
18. [Known Limitations & Phase 2 Scope](#18-known-limitations--phase-2-scope)
19. [Phase 1 Completion Report](#19-phase-1-completion-report)

---

## 1. Project Overview

Wisely is a full-stack personal finance web application. It allows authenticated users to:

- Log income and expense transactions with categories and payment methods
- Set monthly budgets per expense category and track spending against them
- Create savings goals with target amounts and deadlines
- View financial analytics across selectable time periods
- Filter, search, and sort all transaction history

The application has no external database dependency — it uses SQLite via `sql.js` (a pure JavaScript SQLite port), meaning it runs on any machine with Node.js without any native compilation or database server setup.

---

## 2. Architecture

```
Browser
  └── http://localhost:5000
        ├── GET /           → client/pages/index.html    (landing page)
        ├── GET /login      → client/pages/login.html
        ├── GET /signup     → client/pages/signup.html
        ├── GET /dashboard  → client/pages/dashboard.html
        ├── GET /css/*      → client/css/
        ├── GET /js/*       → client/js/
        ├── GET /assets/*   → client/assets/
        └── /api/*          → Express API (JWT protected)
```

**Request lifecycle (authenticated API call):**
1. Browser sends `fetch('/api/transactions', { headers: { Authorization: 'Bearer <token>' } })`
2. `auth.middleware.js` verifies the JWT, attaches `req.user = { id, email }`
3. `validate.middleware.js` validates the request body
4. The controller queries SQLite via `sql.js`, scoping all queries to `req.user.id`
5. `persist()` writes the in-memory database back to `wisely.db` after every write
6. Controller returns JSON response

---

## 3. Database Schema

All four tables live in `server/db/wisely.db` (SQLite).

### users
```sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
first_name    TEXT NOT NULL
last_name     TEXT NOT NULL
email         TEXT NOT NULL UNIQUE
password_hash TEXT NOT NULL          -- bcrypt hash, never plaintext
created_at    TEXT NOT NULL          -- ISO-8601
updated_at    TEXT NOT NULL
```

### transactions
```sql
id               INTEGER PRIMARY KEY AUTOINCREMENT
user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
type             TEXT NOT NULL CHECK(type IN ('Income','Expense'))
amount           REAL NOT NULL CHECK(amount > 0)
description      TEXT NOT NULL DEFAULT ''
category         TEXT NOT NULL CHECK(category IN (
                     'Salary','Freelance','Business','Investment',
                     'Food','Transport','Shopping','Bills & Utilities',
                     'Education','Health','Entertainment','Travel','Rent','Other'))
payment_method   TEXT NOT NULL CHECK(payment_method IN (
                     'Cash','UPI','Debit Card','Credit Card','Bank Transfer'))
transaction_date TEXT NOT NULL       -- YYYY-MM-DD
created_at       TEXT NOT NULL
updated_at       TEXT NOT NULL
```

**Indexes:** `(user_id)`, `(user_id, type)`, `(user_id, transaction_date DESC)`, `(user_id, category)`

### budgets
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
category   TEXT NOT NULL                         -- expense categories only
amount     REAL NOT NULL CHECK(amount > 0)       -- the budget limit
month      INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12)
year       INTEGER NOT NULL CHECK(year >= 2000)
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
UNIQUE(user_id, category, month, year)           -- one budget per category/month
```

### savings_goals
```sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
name          TEXT NOT NULL
target_amount REAL NOT NULL CHECK(target_amount > 0)
target_date   TEXT                               -- NULL = open-ended
created_at    TEXT NOT NULL
updated_at    TEXT NOT NULL
```

**Relationship summary:** Every user-owned record has `user_id` with `ON DELETE CASCADE` — deleting a user removes all their data automatically.

---

## 4. Backend — API Reference

### Auth endpoints

#### POST /api/auth/signup
**Body:** `{ first_name, last_name, email, password }`
**Returns:** `{ success, data: { token, user } }`
- Validates all fields, checks for duplicate email
- Hashes password with bcrypt (12 rounds)
- Creates user, returns JWT

#### POST /api/auth/login
**Body:** `{ email, password, remember_me? }`
**Returns:** `{ success, message, data: { token, user } }`
- Looks up user by email, compares password hash
- Returns JWT (7d expiry normally, 30d if remember_me=true)

#### POST /api/auth/logout *(protected)*
**Returns:** `{ success, message }`
- Stateless — client drops the token. Endpoint exists for future blacklist support.

#### GET /api/auth/me *(protected)*
**Returns:** `{ success, data: { user } }` — never includes password_hash

---

### Transaction endpoints *(all protected)*

#### GET /api/transactions
**Query params:** `type, category, start_date, end_date, limit, offset`
**Returns:** `{ transactions[], summary: { total_income, total_expenses, net_balance, total_count } }`

#### POST /api/transactions
**Body:** `{ type, amount, description?, category, payment_method, transaction_date }`
- `user_id` derived from JWT, never from body
- Returns created transaction

#### PUT /api/transactions/:id
- Verifies ownership (user_id must match JWT user)
- Returns updated transaction

#### DELETE /api/transactions/:id
- Verifies ownership, then deletes

---

### Budget endpoints *(all protected)*

#### GET /api/budgets?month=&year=
- When month + year provided, enriches each budget with:
  - `spent` — actual expense total from transactions in that month
  - `remaining` — amount - spent
  - `percent` — (spent / amount) * 100, capped at 100

#### POST /api/budgets
**Body:** `{ category, amount, month, year }`
- Returns 409 if a budget for that category/month/year already exists

#### PUT /api/budgets/:id
#### DELETE /api/budgets/:id

---

### Savings Goal endpoints *(all protected)*

#### GET /api/savings
#### POST /api/savings
**Body:** `{ name, target_amount, target_date? }`
#### PUT /api/savings/:id
#### DELETE /api/savings/:id

---

### Dashboard endpoints *(all protected)*

All 4 endpoints accept the same period query params:
```
?period=this_month|last_month|this_year|all|custom
&start=YYYY-MM-DD   (required when period=custom)
&end=YYYY-MM-DD     (required when period=custom)
```

#### GET /api/dashboard/summary
**Returns:** `{ total_income, total_expenses, net_balance, total_count, period }`

#### GET /api/dashboard/category-breakdown
**Returns:** `{ breakdown: [{ category, total, count, percentage }], grand_total, period }`
- Only expense transactions, grouped by category, sorted by total DESC

#### GET /api/dashboard/monthly-flow
**Returns:** `{ monthly_flow: [{ month, income, expenses, net }], period }`
- Grouped by `strftime('%Y-%m', transaction_date)`
- Defaults to last 6 months when no period set

#### GET /api/dashboard/recent-transactions
**Additional query params:** `type, category, payment_method, search, sort (newest|oldest|highest|lowest), limit, offset`
**Returns:** `{ transactions[], total, period }`
- `search` matches against `description` OR `category` (LOWER LIKE)

---

## 5. Frontend — Page Reference

### `/` — index.html (Landing Page)
- Static marketing page
- Loaded by `/js/script.js`
- Animations: IntersectionObserver scroll reveal, counter animation, FAQ accordion, video hover preview
- No API calls

### `/login` — login.html
- Form: email + password + remember me checkbox
- Calls `AuthAPI.login()`, saves token via `WiselyAuth.saveSession()`
- Redirects to `/dashboard` on success
- Already-logged-in users auto-redirected to `/dashboard`

### `/signup` — signup.html
- Form: first name, last name, email, password, confirm password, terms checkbox
- Real-time validation: email format, password strength meter (4 bars), confirm match
- Calls `AuthAPI.signup()`, auto-logs in, redirects to `/dashboard`

### `/dashboard` — dashboard.html
- The full application — all JS is inline in a single `<script>` block
- Auth-guarded: checks `WiselyAuth.isLoggedIn()`, verifies with `/api/auth/me`
- See sections 8–14 for detailed dashboard documentation

---

## 6. Authentication Flow

### Token storage
```
WiselyAuth.TOKEN_KEY = 'wisely_token'   ← stored in localStorage (persistent) or
WiselyAuth.USER_KEY  = 'wisely_user'       sessionStorage (session-only, no remember-me)
```

### Signup / Login flow
```
User fills form
  → Client-side validation (instant feedback)
  → AuthAPI.signup() / AuthAPI.login()
  → Backend validates, hashes password, issues JWT
  → WiselyAuth.saveSession(token, user, persistent)
  → Redirect to /dashboard
```

### Dashboard auth guard
```
Page loads
  → WiselyAuth.isLoggedIn() — checks if token exists
  → If false: redirect to /login immediately
  → If true: paint UI from cached user (no flicker)
  → AuthAPI.me() in background — verify token still valid
  → If 401: clear session, redirect to /login
  → If 200: refresh UI with authoritative DB data
```

### API request pattern
Every `apiRequest()` call in `api.js`:
1. Reads token from `WiselyAuth.getToken()`
2. Adds `Authorization: Bearer <token>` header
3. On 401 response: calls `WiselyAuth.clearSession()`, redirects to `/login`
4. On network error (status 0): returns `{ success: false, message: 'Cannot connect to server...' }`

---

## 7. Frontend API Client (api.js)

`client/js/api.js` is the single source of truth for all backend communication.

### Objects exported (global scope)
```js
WiselyAuth        // Token storage, session management
AuthAPI           // signup, login, logout, me
TransactionAPI    // getAll, getOne, create, update, remove
BudgetAPI         // getAll, create, update, remove
SavingsAPI        // getAll, create, update, remove
DashboardAPI      // getSummary, getCategoryBreakdown, getMonthlyFlow, getRecentTransactions
TX_CATEGORIES     // { Income: [...], Expense: [...] }
TX_PAYMENT_METHODS
BUDGET_CATEGORIES
```

### DashboardAPI._qs(params)
Converts a params object to a query string, omitting null/undefined values:
```js
DashboardAPI._qs({ period: 'this_month', type: null, sort: 'newest' })
// → '?period=this_month&sort=newest'
```

---

## 8. Dashboard Data Flow

On every `refreshAll()` call:

```
1. setGlobalLoading(true)          ← full-page overlay (first load only)
2. setCardsLoading(true)           ← skeleton shimmer on 4 cards
3. setChartState('flow','loading') ← spinner on each chart
4. setChartState('cat','loading')
5. setChartState('trend','loading')

6. await loadSavingsGoal()         ← GET /api/savings → sets window._activeGoal

7. await Promise.all([
     DashboardAPI.getSummary(period),
     DashboardAPI.getCategoryBreakdown(period),
     DashboardAPI.getMonthlyFlow(period),
   ])

8. renderSummary(data)             ← 4 summary cards (uses _activeGoal for savings)
9. renderCatChart(breakdown)       ← doughnut chart
10. renderInsights(summary, breakdown) ← insight chips
11. renderFlowChart(monthly_flow)  ← grouped bar chart
12. window._lastCatBreakdown = breakdown  ← cache for budget spend overlay

13. await loadBudgets()            ← GET /api/budgets?month=&year=
                                      → renderBudgets(rows, spendMap)

14. await loadTransactions()       ← GET /api/dashboard/recent-transactions
                                      → renderTrendChart(transactions)
                                      → renderTransactions(transactions, total)
```

`loadTransactions()` is also called independently when search/filter/sort controls change — without re-fetching summary or charts.

---

## 9. Period Filtering System

### Frontend state
```js
let activePeriod = { period: 'this_year', start: null, end: null };
```

### Period options
| Button | `period` value | Backend resolves to |
|---|---|---|
| This Month | `this_month` | First day to last day of current month |
| Last Month | `last_month` | First day to last day of previous month |
| This Year | `this_year` | Jan 1 to Dec 31 of current year |
| All Time | `all` | No date filter |
| Custom | `custom` | User-specified `start` + `end` |

### Backend resolution (`resolvePeriod()` in dashboard.controller.js)
The controller resolves the period string into `{ start, end }` ISO date strings and appends `WHERE transaction_date >= ? AND transaction_date <= ?` clauses to every query. When no period is set, no date filter is applied.

---

## 10. Transaction System

### Category system
- **Income categories:** Salary, Freelance, Business, Investment, Other
- **Expense categories:** Food, Transport, Shopping, Bills & Utilities, Education, Health, Entertainment, Travel, Rent, Other

The modal's category dropdown dynamically updates based on the selected type. Switching Income ↔ Expense repopulates the dropdown.

### Edit flow
1. User clicks pencil icon on any transaction row
2. `editTransaction(id)` calls `GET /api/transactions/:id`
3. Form pre-filled with existing values
4. `txSubmitBtn.dataset.editId` is set to the transaction ID
5. On submit: `TransactionAPI.update(id, payload)` instead of `create()`
6. Success: `refreshAll()` re-fetches everything

### Delete flow
1. User clicks trash icon → `deleteTransaction(id)`
2. `showConfirm(id, 'transaction')` shows confirmation modal
3. User confirms → `TransactionAPI.remove(id)`
4. Success: `refreshAll()`, toast notification

---

## 11. Budget System

### One budget per category/month/year
The `budgets` table has a `UNIQUE(user_id, category, month, year)` constraint. The API returns 409 Conflict if a budget for that combination already exists, with the message "Use PUT to update it."

### Spending enrichment
`GET /api/budgets?month=9&year=2026` returns:
```json
{
  "id": 1,
  "category": "Food",
  "amount": 8000,
  "spent": 3200,
  "remaining": 4800,
  "percent": 40
}
```
`spent` is calculated by summing all Expense transactions in that calendar month from the `transactions` table.

### Budget modal default month/year
The Set Budget modal defaults to the currently active period's month/year. If viewing "This Year", it defaults to the current calendar month.

---

## 12. Savings Goals System

### Active goal
The dashboard displays the **first goal** (most recently created) from the user's savings goals list as the "active goal". The savings card shows:
- Goal name
- Current savings amount (net_balance from the selected period)
- Percentage progress toward target
- Days remaining to deadline (turns red at ≤30 days)
- "Deadline passed" if target_date is in the past

### No goal set state
When no goals exist, the savings card shows "No goal set — click Goal to create one" instead of percentage.

---

## 13. Analytics & Charts

All three charts use Chart.js 4 (loaded from CDN). Every chart:
1. Shows a loading spinner while data is fetched
2. Shows an empty/error state with contextual message if no data
3. Is destroyed and recreated on every `refreshAll()` to avoid memory leaks

### Chart 1: Monthly Flow (Bar)
- **Source:** `GET /api/dashboard/monthly-flow`
- **Type:** Grouped bar (Income = green, Expenses = blue)
- **X-axis:** Month labels formatted as "Sep 26"
- **Y-axis:** ₹ amounts

### Chart 2: Category Breakdown (Doughnut)
- **Source:** `GET /api/dashboard/category-breakdown`
- **Type:** Doughnut, cutout 65%
- **Colors:** Per `CATEGORY_COLORS` map in dashboard script
- **Tooltip:** Shows amount + percentage
- **Empty state:** "No expense data yet"

### Chart 3: Spending Trend (Line)
- **Source:** `recent-transactions` (expense type only, from the current filter call)
- **Type:** Line with fill
- **Dataset 1:** Daily spend (blue, filled area)
- **Dataset 2:** Cumulative spend (amber, dashed)
- **X-axis:** Individual transaction dates
- **Empty state:** "Not enough data to show a trend" (needs ≥2 expense data points)

### Analytics Insight Chips
Three chips rendered above the charts:
- Top spending category and its percentage of total expenses
- Savings rate (income - expenses / income × 100) — green ≥20%, yellow 0–19%, red negative
- Total transaction count for the period

---

## 14. UI States Reference

### Toast notifications
```js
showToast(message, type)  // type: 'success' | 'error' | 'info'
```
- Fixed position bottom-right (bottom-center on mobile)
- Auto-dismisses after 3.5s
- Used for: transaction added/updated/deleted, budget saved, goal saved, invalid period input

### Loading states
| State | Where | Element |
|---|---|---|
| Global overlay | First dashboard load | `#dash-loading-overlay` |
| Card skeleton | All 4 summary cards | `.skeleton` class added |
| Chart spinner | Per chart | `#chart-{name}-loading` |

### Empty states
| Trigger | Message |
|---|---|
| No transactions, no filters | "No transactions yet. Start tracking your finances by adding your first transaction." |
| No transactions, with filters | "No matching transactions. Try adjusting your search or filters." |
| No expense data | "No expense data yet." (on chart) |
| No monthly data | "No data for this period." (on chart) |
| Trend needs more data | "Not enough data to show a trend." |
| No budgets set | "No budgets set for this period. Click Set Budget to create one." |

### Error states
| Trigger | Element |
|---|---|
| Analytics API fails | `#analytics-error` red banner with Retry button |
| Transaction API fails | `#tx-error-banner` red banner with Retry button |

### Form validation
All form errors use inline `<p>` elements displayed below the submit button. Budget and goal forms use `showBudgetError()` / `showGoalError()`. Transaction form uses `showError()`.

---

## 15. Responsive Breakpoints

### Dashboard (`client/pages/dashboard.html` inline CSS)
| Breakpoint | Changes |
|---|---|
| 992px (tablet landscape) | Cards: 2-col grid; sidebar stacks below main; charts stack |
| 768px (tablet portrait) | Hide payment column in table; search bar full-width; form rows stack |
| 600px (large phone) | Cards: 1-col; welcome section stacks; Log Transaction button full-width |
| 480px (mobile) | Modals become bottom sheets; table hides category + payment columns; filter toolbar stacks; period buttons wrap; toast spans full width |

### Landing page (`client/css/style.css`)
| Breakpoint | Changes |
|---|---|
| 1024px | Hero: single column; features: 2-col; steps wrap |
| 768px | Nav links hidden (hamburger shown); hero centred; stats: 2-col |
| 480px | Hero title smaller; CTA buttons stack full-width; stats: 2-col |

### Auth pages (`client/css/auth.css`)
| Breakpoint | Changes |
|---|---|
| 900px | Left decorative panel hidden |
| 500px | Full single-column form |
| 480px | Form rows stack to single column |

---

## 16. Folder Structure

```
Wisely/
├── client/                 # Frontend (served as static files by Express)
│   ├── pages/
│   │   ├── index.html      # Landing page
│   │   ├── login.html      # Login
│   │   ├── signup.html     # Registration
│   │   └── dashboard.html  # App (auth-guarded)
│   ├── css/
│   │   ├── style.css       # Landing page
│   │   └── auth.css        # Auth pages
│   ├── js/
│   │   ├── api.js          # API client + constants
│   │   ├── auth.js         # Auth form handlers
│   │   └── script.js       # Landing page interactivity
│   └── assets/
│       ├── dashboard-preview.png
│       ├── dashboard-preview.webp
│       └── logo/wisely-logo.png
│
├── server/                 # Backend (Node.js + Express)
│   ├── config/
│   │   └── config.js       # Env-based config
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── transactions.controller.js
│   │   ├── budgets.controller.js
│   │   ├── savings.controller.js
│   │   └── dashboard.controller.js
│   ├── db/
│   │   ├── schema.sql      # Table definitions
│   │   ├── database.js     # sql.js init + persist
│   │   └── wisely.db       # SQLite file (gitignored)
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT protect()
│   │   └── validate.middleware.js
│   └── routes/
│       ├── auth.routes.js
│       ├── transactions.routes.js
│       ├── budgets.routes.js
│       ├── savings.routes.js
│       └── dashboard.routes.js
│
├── server.js               # Entry point
├── package.json
├── .env                    # Gitignored
├── .gitignore
├── README.md
└── DOCUMENTATION.md        # This file
```

---

## 17. Environment & Configuration

### .env
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=<long random string — change before deployment>
JWT_EXPIRES_IN=7d
JWT_REMEMBER_IN=30d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### server/config/config.js
Central config object — reads from `.env` with sensible defaults. Consumed by all backend files via `require('../config/config')`.

### Database
`sql.js` loads the entire SQLite database into memory on startup. After every write operation, `persist()` exports the in-memory DB back to `wisely.db`. This means:
- Fast reads (in-memory)
- Slightly slower writes (disk write on every mutation)
- If the server crashes mid-write, the last transaction may not be persisted (acceptable for Phase 1)

---

## 18. Known Limitations & Phase 2 Scope

| Limitation | Phase 2 Plan |
|---|---|
| JWT is stateless — logout cannot truly invalidate a token | Token blacklist (Redis or DB table) |
| Password reset is not implemented | Email-based reset flow |
| Google OAuth buttons exist in UI but are not functional | OAuth 2.0 integration |
| Only one active savings goal shown on the card | Multiple goals, each with own progress bar |
| Budget limits are per-month and user-defined — no carry-forward | Smart budget suggestions based on history |
| No data export | CSV / PDF export |
| sql.js writes entire DB on every mutation | Migrate to better-sqlite3 (requires Visual C++ on Windows) or PostgreSQL |
| No email notifications | Budget exceeded alerts, weekly summaries |
| No recurring transactions | Recurring entry templates |

---

## 19. Phase 1 Completion Report

### Summary
Phase 1 of Wisely is complete. The application is a fully functional personal finance tracker with a real backend, real database, and real authentication.

### What was built

#### Backend (Node.js + Express + SQLite)
- JWT authentication system (register, login, logout, session verification)
- Full CRUD for all 4 entities: users, transactions, budgets, savings goals
- 4 dashboard aggregation endpoints with period filtering
- Request validation middleware
- Ownership enforcement on every protected resource (user_id from JWT only)
- bcrypt password hashing — no plaintext passwords stored anywhere

#### Frontend (Vanilla HTML/CSS/JS)
- Landing page with scroll animations, FAQ accordion, counter animations
- Login + Signup with real-time validation, password strength meter, toast notifications
- Dashboard with:
  - Period selector (This Month / Last Month / This Year / All Time / Custom range)
  - 4 summary cards (balance, income, expenses, savings progress)
  - 3 charts: Monthly Flow bar, Category Breakdown doughnut, Spending Trend line
  - Analytics insight chips (top spend category, savings rate, transaction count)
  - Transaction table with search, type/category/payment/sort filters
  - Full transaction CRUD (add, edit with pre-fill, delete with confirmation)
  - Monthly budget panel with spending enrichment (spent/remaining/%, exceeded badge)
  - Budget CRUD (create, edit, delete per category/month)
  - Savings goal card (DB-driven target, days remaining, deadline urgency)
  - Savings goal CRUD
  - Loading states (global overlay, card skeleton, per-chart spinner)
  - Empty states with contextual messages
  - Error states with retry buttons
  - Toast notification system

#### Folder structure
Clean, conventional separation:
- `client/` — all frontend (pages, css, js, assets)
- `server/` — all backend (controllers, routes, middleware, db, config)
- `server.js` — single entry point serving both API and static frontend

#### Responsive design
- Desktop (1200px+): full 4-column card grid, 2-column dashboard layout
- Tablet (768–992px): 2-column cards, stacked panels, hidden payment column
- Mobile (≤480px): single column everything, bottom-sheet modals, full-width controls

### Files delivered
| File | Purpose |
|---|---|
| `server.js` | Express app entry point |
| `server/controllers/*` | 5 controllers (auth, transactions, budgets, savings, dashboard) |
| `server/routes/*` | 5 route files |
| `server/middleware/*` | JWT auth + request validation |
| `server/db/schema.sql` | SQLite schema (4 tables, indexes, constraints) |
| `server/db/database.js` | sql.js singleton |
| `server/config/config.js` | Central configuration |
| `client/pages/index.html` | Landing page |
| `client/pages/login.html` | Login |
| `client/pages/signup.html` | Signup |
| `client/pages/dashboard.html` | Full application |
| `client/css/style.css` | Landing styles + responsive |
| `client/css/auth.css` | Auth styles + responsive |
| `client/js/api.js` | API client (WiselyAuth, AuthAPI, TransactionAPI, DashboardAPI, BudgetAPI, SavingsAPI) |
| `client/js/auth.js` | Form handlers |
| `client/js/script.js` | Landing interactivity |
| `.env` | Environment config (gitignored) |
| `.gitignore` | Excludes node_modules, .env, wisely.db |
| `README.md` | GitHub project overview |
| `DOCUMENTATION.md` | This file |

### API endpoints delivered
17 endpoints total across 5 resource groups. All protected endpoints enforce ownership via JWT. No user_id is ever accepted from the request body.

### Phase 1 sign-off
The application is stable, all major features are functional, the codebase is clean and organized, and the project is ready to be pushed to GitHub.
