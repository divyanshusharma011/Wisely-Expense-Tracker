// ============================================================
//  api.js — Wisely frontend API client
//
//  Single source of truth for:
//  - The backend base URL
//  - JWT token storage/retrieval  (localStorage key: wisely_token)
//  - Session cache                (localStorage key: wisely_user)
//  - All authenticated fetch calls
//
//  Replaces the old wisely_users / wisely_session localStorage keys.
// ============================================================

const API_BASE = '/api';

// ── Token helpers ────────────────────────────────────────────────

const WiselyAuth = {
    TOKEN_KEY: 'wisely_token',
    USER_KEY:  'wisely_user',

    // Save token + user after login/signup
    saveSession(token, user, persistent = true) {
        const store = persistent ? localStorage : sessionStorage;
        store.setItem(this.TOKEN_KEY, token);
        store.setItem(this.USER_KEY, JSON.stringify(user));
    },

    // Get the active token (check localStorage first, then sessionStorage)
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY)
            || sessionStorage.getItem(this.TOKEN_KEY)
            || null;
    },

    // Get the cached user object
    getUser() {
        const raw = localStorage.getItem(this.USER_KEY)
            || sessionStorage.getItem(this.USER_KEY)
            || null;
        try { return raw ? JSON.parse(raw) : null; }
        catch { return null; }
    },

    // Remove everything — called on logout
    clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.USER_KEY);
    },

    // True if a token exists (does NOT verify expiry — use /api/auth/me for that)
    isLoggedIn() {
        return !!this.getToken();
    },
};

// ── Core fetch wrapper ────────────────────────────────────────────

/**
 * apiRequest(path, options)
 *
 * Wraps fetch with:
 *  - Base URL prepended
 *  - Content-Type: application/json
 *  - Authorization: Bearer <token>  (if token exists)
 *  - Automatic 401 → logout + redirect to /login
 *
 * Returns: { success, data, message, status }
 */
async function apiRequest(path, options = {}) {
    const token = WiselyAuth.getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    try {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        // Token expired or invalid — clear session and redirect
        if (response.status === 401) {
            WiselyAuth.clearSession();
            // Only redirect if we're not already on an auth page
            const path = window.location.pathname;
            if (!path.endsWith('login.html')
                && !path.endsWith('signup.html')
                && !path.endsWith('/login')
                && !path.endsWith('/signup')) {
                window.location.href = '/login';
            }
        }

        return { ...data, status: response.status };
    } catch (err) {
        // Network error (server down, CORS, etc.)
        return {
            success: false,
            status: 0,
            message: 'Cannot connect to the server. Please make sure the backend is running.',
        };
    }
}

// ── Auth API calls ────────────────────────────────────────────────

const AuthAPI = {
    async signup(payload) {
        return apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async login(payload) {
        return apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async logout() {
        const result = await apiRequest('/auth/logout', { method: 'POST' });
        WiselyAuth.clearSession();
        return result;
    },

    async me() {
        return apiRequest('/auth/me', { method: 'GET' });
    },
};

// ── Transaction API calls ─────────────────────────────────────────

const TransactionAPI = {
    // GET /api/transactions  (optional filters: type, category, start_date, end_date)
    async getAll(filters = {}) {
        const params = new URLSearchParams();
        if (filters.type)       params.set('type',       filters.type);
        if (filters.category)   params.set('category',   filters.category);
        if (filters.start_date) params.set('start_date', filters.start_date);
        if (filters.end_date)   params.set('end_date',   filters.end_date);
        if (filters.limit)      params.set('limit',      filters.limit);
        if (filters.offset)     params.set('offset',     filters.offset);
        const qs = params.toString();
        return apiRequest(`/transactions${qs ? '?' + qs : ''}`, { method: 'GET' });
    },

    // GET /api/transactions/:id
    async getOne(id) {
        return apiRequest(`/transactions/${id}`, { method: 'GET' });
    },

    // POST /api/transactions
    async create(payload) {
        return apiRequest('/transactions', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    // PUT /api/transactions/:id
    async update(id, payload) {
        return apiRequest(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    // DELETE /api/transactions/:id
    async remove(id) {
        return apiRequest(`/transactions/${id}`, { method: 'DELETE' });
    },
};

// ── Category + payment method constants (mirrors backend) ─────────

const TX_CATEGORIES = {
    Income:  ['Salary', 'Freelance', 'Business', 'Investment', 'Other'],
    Expense: ['Food', 'Transport', 'Shopping', 'Bills & Utilities',
              'Education', 'Health', 'Entertainment', 'Travel', 'Rent', 'Other'],
};

const TX_PAYMENT_METHODS = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer'];

// ── Dashboard API calls ───────────────────────────────────────────
//
//  All endpoints accept an optional `params` object:
//    period  : 'this_month' | 'last_month' | 'this_year' | 'custom' | 'all'
//    start   : 'YYYY-MM-DD'   (only used when period='custom')
//    end     : 'YYYY-MM-DD'   (only used when period='custom')

const DashboardAPI = {
    // Build a query-string from a params object, omitting null/undefined
    _qs(params = {}) {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') p.set(k, v);
        });
        const s = p.toString();
        return s ? '?' + s : '';
    },

    // GET /api/dashboard/summary
    async getSummary(params = {}) {
        return apiRequest(`/dashboard/summary${this._qs(params)}`, { method: 'GET' });
    },

    // GET /api/dashboard/category-breakdown
    async getCategoryBreakdown(params = {}) {
        return apiRequest(`/dashboard/category-breakdown${this._qs(params)}`, { method: 'GET' });
    },

    // GET /api/dashboard/monthly-flow
    async getMonthlyFlow(params = {}) {
        return apiRequest(`/dashboard/monthly-flow${this._qs(params)}`, { method: 'GET' });
    },

    // GET /api/dashboard/recent-transactions
    //   Additional supported params:
    //     type, category, payment_method, search, sort, limit, offset
    async getRecentTransactions(params = {}) {
        return apiRequest(`/dashboard/recent-transactions${this._qs(params)}`, { method: 'GET' });
    },
};

// ── Budget API calls ──────────────────────────────────────────────
//  GET  /api/budgets?month=&year=   — list, enriched with spent/remaining/percent
//  POST /api/budgets                — create
//  PUT  /api/budgets/:id            — update
//  DELETE /api/budgets/:id          — delete

const BudgetAPI = {
    // GET /api/budgets  — optionally filter by month + year for enrichment
    async getAll(month, year) {
        const qs = month && year ? `?month=${month}&year=${year}` : '';
        return apiRequest(`/budgets${qs}`, { method: 'GET' });
    },

    // POST /api/budgets
    async create(payload) {
        return apiRequest('/budgets', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    // PUT /api/budgets/:id
    async update(id, payload) {
        return apiRequest(`/budgets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    // DELETE /api/budgets/:id
    async remove(id) {
        return apiRequest(`/budgets/${id}`, { method: 'DELETE' });
    },
};

// Expense categories that can have a budget (mirrors backend VALID_CATEGORIES_BUDGET)
const BUDGET_CATEGORIES = [
    'Food', 'Transport', 'Shopping', 'Bills & Utilities',
    'Education', 'Health', 'Entertainment', 'Travel', 'Rent', 'Other',
];

// ── Savings Goal API calls ────────────────────────────────────────
const SavingsAPI = {
    async getAll() {
        return apiRequest('/savings', { method: 'GET' });
    },
    async create(payload) {
        return apiRequest('/savings', { method: 'POST', body: JSON.stringify(payload) });
    },
    async update(id, payload) {
        return apiRequest(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    async remove(id) {
        return apiRequest(`/savings/${id}`, { method: 'DELETE' });
    },
};
