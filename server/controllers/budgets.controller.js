// ============================================================
//  budgets.controller.js — CRUD for monthly category budgets
//  One row per user / category / month / year (UNIQUE constraint)
// ============================================================
const { getDb, persist } = require('../db/database');

function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

// ----------------------------------------------------------------
//  GET /api/budgets?month=&year=
// ----------------------------------------------------------------
function getAll(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { month, year } = req.query;

        let sql    = 'SELECT * FROM budgets WHERE user_id = ?';
        const params = [userId];

        if (month) { sql += ' AND month = ?'; params.push(parseInt(month, 10)); }
        if (year)  { sql += ' AND year = ?';  params.push(parseInt(year, 10)); }

        sql += ' ORDER BY year DESC, month DESC, category ASC';

        const rows = queryAll(db, sql, params);

        // If month + year provided, include spending totals per category
        let spending = [];
        if (month && year) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;
            spending = queryAll(db,
                `SELECT category,
                        COALESCE(SUM(amount), 0) AS spent
                   FROM transactions
                  WHERE user_id = ?
                    AND type = 'Expense'
                    AND transaction_date BETWEEN ? AND ?
                  GROUP BY category`,
                [userId, startDate, endDate]
            );
        }

        const spendMap = {};
        spending.forEach(s => { spendMap[s.category] = s.spent; });

        const enriched = rows.map(b => ({
            ...b,
            spent:      spendMap[b.category] || 0,
            remaining:  b.amount - (spendMap[b.category] || 0),
            percent:    b.amount > 0
                ? Math.round(((spendMap[b.category] || 0) / b.amount) * 100)
                : 0,
        }));

        return res.status(200).json({ success: true, data: { budgets: enriched } });
    } catch (err) {
        console.error('[budgets/getAll]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch budgets.' });
    }
}

// ----------------------------------------------------------------
//  GET /api/budgets/:id
// ----------------------------------------------------------------
function getOne(req, res) {
    try {
        const db = getDb();
        const [budget] = queryAll(db,
            'SELECT * FROM budgets WHERE id = ? AND user_id = ? LIMIT 1',
            [req.params.id, req.user.id]
        );
        if (!budget) {
            return res.status(404).json({ success: false, message: 'Budget not found.' });
        }
        return res.status(200).json({ success: true, data: { budget } });
    } catch (err) {
        console.error('[budgets/getOne]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch budget.' });
    }
}

// ----------------------------------------------------------------
//  POST /api/budgets
// ----------------------------------------------------------------
function create(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { category, amount, month, year } = req.body;

        // Check for existing budget (same user/category/month/year)
        const [existing] = queryAll(db,
            'SELECT id FROM budgets WHERE user_id = ? AND category = ? AND month = ? AND year = ? LIMIT 1',
            [userId, category, parseInt(month, 10), parseInt(year, 10)]
        );
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `A budget for ${category} in ${month}/${year} already exists. Use PUT to update it.`,
            });
        }

        db.run(
            'INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)',
            [userId, category, parseFloat(amount), parseInt(month, 10), parseInt(year, 10)]
        );
        persist();

        const [budget] = queryAll(db,
            'SELECT * FROM budgets WHERE rowid = last_insert_rowid() AND user_id = ? LIMIT 1',
            [userId]
        );

        return res.status(201).json({
            success: true,
            message: 'Budget created.',
            data: { budget },
        });
    } catch (err) {
        console.error('[budgets/create]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create budget.' });
    }
}

// ----------------------------------------------------------------
//  PUT /api/budgets/:id
// ----------------------------------------------------------------
function update(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const budgetId = req.params.id;

        const [existing] = queryAll(db,
            'SELECT * FROM budgets WHERE id = ? AND user_id = ? LIMIT 1',
            [budgetId, userId]
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Budget not found.' });
        }

        const {
            category = existing.category,
            amount   = existing.amount,
            month    = existing.month,
            year     = existing.year,
        } = req.body;

        db.run(
            `UPDATE budgets SET
               category = ?, amount = ?, month = ?, year = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
             WHERE id = ? AND user_id = ?`,
            [category, parseFloat(amount), parseInt(month, 10), parseInt(year, 10), budgetId, userId]
        );
        persist();

        const [updated] = queryAll(db,
            'SELECT * FROM budgets WHERE id = ? AND user_id = ? LIMIT 1',
            [budgetId, userId]
        );

        return res.status(200).json({ success: true, message: 'Budget updated.', data: { budget: updated } });
    } catch (err) {
        console.error('[budgets/update]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update budget.' });
    }
}

// ----------------------------------------------------------------
//  DELETE /api/budgets/:id
// ----------------------------------------------------------------
function remove(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const budgetId = req.params.id;

        const [existing] = queryAll(db,
            'SELECT id FROM budgets WHERE id = ? AND user_id = ? LIMIT 1',
            [budgetId, userId]
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Budget not found.' });
        }

        db.run('DELETE FROM budgets WHERE id = ? AND user_id = ?', [budgetId, userId]);
        persist();

        return res.status(200).json({ success: true, message: 'Budget deleted.' });
    } catch (err) {
        console.error('[budgets/delete]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete budget.' });
    }
}

module.exports = { getAll, getOne, create, update, remove };
