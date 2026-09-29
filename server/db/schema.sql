-- ============================================================
--  WISELY DATABASE SCHEMA
--  Engine: SQLite (via sql.js)
--  All timestamps stored as ISO-8601 strings (SQLite has no
--  native DATETIME type; TEXT is the standard convention).
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
--  TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name   TEXT    NOT NULL CHECK(length(trim(first_name))  > 0),
    last_name    TEXT    NOT NULL CHECK(length(trim(last_name))   > 0),
    email        TEXT    NOT NULL UNIQUE
                         CHECK(email LIKE '%_@_%.__%'),
    password_hash TEXT   NOT NULL CHECK(length(password_hash) > 0),
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
--  TABLE: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type             TEXT    NOT NULL CHECK(type IN ('Income', 'Expense')),
    amount           REAL    NOT NULL CHECK(amount > 0),
    description      TEXT    NOT NULL DEFAULT '',
    category         TEXT    NOT NULL CHECK(category IN (
                         -- Income categories
                         'Salary', 'Freelance', 'Business', 'Investment',
                         -- Expense categories
                         'Food', 'Transport', 'Shopping', 'Bills & Utilities',
                         'Education', 'Health', 'Entertainment', 'Travel',
                         'Rent',
                         -- Shared
                         'Other'
                     )),
    payment_method   TEXT    NOT NULL DEFAULT 'Cash'
                             CHECK(payment_method IN (
                                 'Cash', 'UPI', 'Debit Card',
                                 'Credit Card', 'Bank Transfer'
                             )),
    transaction_date TEXT    NOT NULL,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category  ON transactions(user_id, category);

-- ============================================================
--  TABLE: budgets
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category   TEXT    NOT NULL CHECK(category IN (
                   'Food', 'Transport', 'Shopping', 'Bills & Utilities',
                   'Education', 'Health', 'Entertainment', 'Travel',
                   'Rent', 'Other'
               )),
    amount     REAL    NOT NULL CHECK(amount > 0),
    month      INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
    year       INTEGER NOT NULL CHECK(year >= 2000),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    -- One budget row per user / category / month / year
    UNIQUE(user_id, category, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id    ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period     ON budgets(user_id, year, month);

-- ============================================================
--  TABLE: savings_goals
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_goals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL CHECK(length(trim(name)) > 0),
    target_amount REAL    NOT NULL CHECK(target_amount > 0),
    target_date   TEXT,          -- NULL = open-ended goal
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
