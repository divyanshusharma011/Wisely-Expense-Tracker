// ============================================================
//  dashboard.controller.js
//  All endpoints are scoped to req.user.id (JWT-verified).
//  Every endpoint accepts the same period query params:
//    period  : 'this_month' | 'last_month' | 'this_year' | 'custom'
//    start   : YYYY-MM-DD  (required when period='custom')
//    end     : YYYY-MM-DD  (required when period='custom')
//  When no period param is supplied the endpoint returns
//  ALL-TIME data (no date filter).
// ============================================================
const { getDb } = require('../db/database');

// ── Helpers ──────────────────────────────────────────────────────

function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

/**
 * Resolve a period string into { start, end } ISO date strings.
 * Returns null for both when no period is requested (all-time).
 */
function resolvePeriod(query) {
    const { period, start, end } = query;

    if (!period || period === 'all') return { start: null, end: null };

    const now   = new Date();
    const pad   = n => String(n).padStart(2, '0');
    const ymd   = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    if (period === 'this_month') {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: ymd(s), end: ymd(e) };
    }

    if (period === 'last_month') {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: ymd(s), end: ymd(e) };
    }

    if (period === 'this_year') {
        return {
            start: `${now.getFullYear()}-01-01`,
            end:   `${now.getFullYear()}-12-31`,
        };
    }

    if (period === 'custom') {
        if (!start || !end) return { start: null, end: null };
        return { start, end };
    }

    return { start: null, end: null };
}

/** Append date-range WHERE clauses and params in-place */
function applyDateRange(whereClauses, params, start, end) {
    if (start) { whereClauses.push('transaction_date >= ?'); params.push(start); }
    if (end)   { whereClauses.push('transaction_date <= ?'); params.push(end);   }
}

// ── GET /api/dashboard/summary ───────────────────────────────────
function getSummary(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { start, end } = resolvePeriod(req.query);

        const where  = ['user_id = ?'];
        const params = [userId];
        applyDateRange(where, params, start, end);
        const whereSQL = where.join(' AND ');

        const [row] = queryAll(db, `
            SELECT
                COALESCE(SUM(CASE WHEN type='Income'  THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN type='Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                COUNT(*)                                                           AS total_count
            FROM transactions
            WHERE ${whereSQL}
        `, params);

        const balance = (row.total_income || 0) - (row.total_expenses || 0);

        return res.status(200).json({
            success: true,
            data: {
                total_income:   row.total_income   || 0,
                total_expenses: row.total_expenses || 0,
                net_balance:    balance,
                total_count:    row.total_count    || 0,
                period:         { start, end },
            },
        });
    } catch (err) {
        console.error('[dashboard/summary]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch summary.' });
    }
}

// ── GET /api/dashboard/category-breakdown ────────────────────────
function getCategoryBreakdown(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { start, end } = resolvePeriod(req.query);

        const where  = ["user_id = ?", "type = 'Expense'"];
        const params = [userId];
        applyDateRange(where, params, start, end);
        const whereSQL = where.join(' AND ');

        const rows = queryAll(db, `
            SELECT
                category,
                COALESCE(SUM(amount), 0) AS total,
                COUNT(*)                 AS count
            FROM transactions
            WHERE ${whereSQL}
            GROUP BY category
            ORDER BY total DESC
        `, params);

        const grandTotal = rows.reduce((s, r) => s + (r.total || 0), 0);

        const breakdown = rows.map(r => ({
            category:   r.category,
            total:      r.total   || 0,
            count:      r.count   || 0,
            percentage: grandTotal > 0
                ? Math.round(((r.total || 0) / grandTotal) * 100)
                : 0,
        }));

        return res.status(200).json({
            success: true,
            data: { breakdown, grand_total: grandTotal, period: { start, end } },
        });
    } catch (err) {
        console.error('[dashboard/category-breakdown]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch category breakdown.' });
    }
}

// ── GET /api/dashboard/monthly-flow ─────────────────────────────
function getMonthlyFlow(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { start, end } = resolvePeriod(req.query);

        // Default: last 6 calendar months when no period set
        let effectiveStart = start;
        let effectiveEnd   = end;
        if (!effectiveStart) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - 5);
            effectiveStart = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
        }

        const where  = ['user_id = ?', 'transaction_date >= ?'];
        const params = [userId, effectiveStart];
        if (effectiveEnd) { where.push('transaction_date <= ?'); params.push(effectiveEnd); }
        const whereSQL = where.join(' AND ');

        const rows = queryAll(db, `
            SELECT
                strftime('%Y-%m', transaction_date)                               AS month,
                COALESCE(SUM(CASE WHEN type='Income'  THEN amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN type='Expense' THEN amount ELSE 0 END), 0) AS expenses
            FROM transactions
            WHERE ${whereSQL}
            GROUP BY month
            ORDER BY month ASC
        `, params);

        return res.status(200).json({
            success: true,
            data: {
                monthly_flow: rows.map(r => ({
                    month:    r.month,
                    income:   r.income   || 0,
                    expenses: r.expenses || 0,
                    net:      (r.income || 0) - (r.expenses || 0),
                })),
                period: { start: effectiveStart, end: effectiveEnd },
            },
        });
    } catch (err) {
        console.error('[dashboard/monthly-flow]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch monthly flow.' });
    }
}

// ── GET /api/dashboard/recent-transactions ───────────────────────
function getRecentTransactions(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { start, end } = resolvePeriod(req.query);
        const limit  = parseInt(req.query.limit  || '50',  10);
        const offset = parseInt(req.query.offset || '0',   10);

        // ── filters ──
        const { type, category, payment_method, search, sort = 'newest' } = req.query;

        const where  = ['user_id = ?'];
        const params = [userId];
        applyDateRange(where, params, start, end);

        if (type)           { where.push('type = ?');           params.push(type); }
        if (category)       { where.push('category = ?');       params.push(category); }
        if (payment_method) { where.push('payment_method = ?'); params.push(payment_method); }
        if (search) {
            where.push("(LOWER(description) LIKE ? OR LOWER(category) LIKE ?)");
            const term = `%${search.toLowerCase()}%`;
            params.push(term, term);
        }

        const whereSQL = where.join(' AND ');

        const ORDER = {
            newest:  'transaction_date DESC, created_at DESC',
            oldest:  'transaction_date ASC,  created_at ASC',
            highest: 'amount DESC',
            lowest:  'amount ASC',
        };
        const orderSQL = ORDER[sort] || ORDER.newest;

        const rows = queryAll(db,
            `SELECT * FROM transactions WHERE ${whereSQL} ORDER BY ${orderSQL} LIMIT ${limit} OFFSET ${offset}`,
            params
        );

        // Total count (no pagination) for the same filters
        const [countRow] = queryAll(db,
            `SELECT COUNT(*) AS n FROM transactions WHERE ${whereSQL}`,
            params
        );

        return res.status(200).json({
            success: true,
            data: {
                transactions: rows,
                total:        countRow.n || 0,
                period:       { start, end },
            },
        });
    } catch (err) {
        console.error('[dashboard/recent-transactions]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
    }
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyFlow, getRecentTransactions };
