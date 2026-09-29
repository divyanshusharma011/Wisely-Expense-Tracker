// ============================================================
//  transactions.controller.js — CRUD for transactions
//  All operations are scoped to req.user.id (JWT-verified)
// ============================================================
const { getDb, persist } = require('../db/database');

// ----------------------------------------------------------------
//  Helper — run sql.js SELECT → plain object array
// ----------------------------------------------------------------
function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

// ----------------------------------------------------------------
//  GET /api/transactions
//  Query params: type, category, start_date, end_date, limit, offset
// ----------------------------------------------------------------
function getAll(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { type, category, start_date, end_date, limit = 50, offset = 0 } = req.query;

        let sql    = 'SELECT * FROM transactions WHERE user_id = ?';
        const params = [userId];

        if (type)       { sql += ' AND type = ?';                 params.push(type); }
        if (category)   { sql += ' AND category = ?';             params.push(category); }
        if (start_date) { sql += ' AND transaction_date >= ?';    params.push(start_date); }
        if (end_date)   { sql += ' AND transaction_date <= ?';    params.push(end_date); }

        sql += ' ORDER BY transaction_date DESC, created_at DESC';
        sql += ` LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`;

        const rows = queryAll(db, sql, params);

        // Summary totals (same filters, no pagination)
        let sumSql = `SELECT
            COALESCE(SUM(CASE WHEN type='Income'  THEN amount ELSE 0 END), 0) AS total_income,
            COALESCE(SUM(CASE WHEN type='Expense' THEN amount ELSE 0 END), 0) AS total_expenses,
            COUNT(*) AS total_count
          FROM transactions WHERE user_id = ?`;
        const sumParams = [userId];
        if (type)       { sumSql += ' AND type = ?';              sumParams.push(type); }
        if (category)   { sumSql += ' AND category = ?';          sumParams.push(category); }
        if (start_date) { sumSql += ' AND transaction_date >= ?'; sumParams.push(start_date); }
        if (end_date)   { sumSql += ' AND transaction_date <= ?'; sumParams.push(end_date); }

        const [summary] = queryAll(db, sumSql, sumParams);

        return res.status(200).json({
            success: true,
            data: {
                transactions: rows,
                summary: {
                    total_income:   summary.total_income,
                    total_expenses: summary.total_expenses,
                    net_balance:    summary.total_income - summary.total_expenses,
                    total_count:    summary.total_count,
                },
            },
        });
    } catch (err) {
        console.error('[transactions/getAll]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
    }
}

// ----------------------------------------------------------------
//  GET /api/transactions/:id
// ----------------------------------------------------------------
function getOne(req, res) {
    try {
        const db = getDb();
        const [tx] = queryAll(db,
            'SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
            [req.params.id, req.user.id]
        );
        if (!tx) {
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }
        return res.status(200).json({ success: true, data: { transaction: tx } });
    } catch (err) {
        console.error('[transactions/getOne]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch transaction.' });
    }
}

// ----------------------------------------------------------------
//  POST /api/transactions
// ----------------------------------------------------------------
function create(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const {
            type,
            amount,
            description = '',
            category,
            payment_method = 'Cash',
            transaction_date,
        } = req.body;

        db.run(
            `INSERT INTO transactions
               (user_id, type, amount, description, category, payment_method, transaction_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, type, parseFloat(amount), (description || '').trim(), category, payment_method, transaction_date]
        );
        persist();

        // Return the created row using last_insert_rowid()
        const [tx] = queryAll(db,
            'SELECT * FROM transactions WHERE rowid = last_insert_rowid() AND user_id = ? LIMIT 1',
            [userId]
        );

        return res.status(201).json({
            success: true,
            message: 'Transaction added.',
            data: { transaction: tx },
        });
    } catch (err) {
        console.error('[transactions/create]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create transaction.' });
    }
}

// ----------------------------------------------------------------
//  PUT /api/transactions/:id
// ----------------------------------------------------------------
function update(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const txId   = req.params.id;

        // Verify ownership
        const [existing] = queryAll(db,
            'SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
            [txId, userId]
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }

        const {
            type             = existing.type,
            amount           = existing.amount,
            description      = existing.description,
            category         = existing.category,
            payment_method   = existing.payment_method,
            transaction_date = existing.transaction_date,
        } = req.body;

        db.run(
            `UPDATE transactions SET
               type = ?, amount = ?, description = ?, category = ?,
               payment_method = ?, transaction_date = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
             WHERE id = ? AND user_id = ?`,
            [type, parseFloat(amount), (description || '').trim(), category,
             payment_method, transaction_date, txId, userId]
        );
        persist();

        const [updated] = queryAll(db,
            'SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
            [txId, userId]
        );

        return res.status(200).json({
            success: true,
            message: 'Transaction updated.',
            data: { transaction: updated },
        });
    } catch (err) {
        console.error('[transactions/update]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update transaction.' });
    }
}

// ----------------------------------------------------------------
//  DELETE /api/transactions/:id
// ----------------------------------------------------------------
function remove(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const txId   = req.params.id;

        const [existing] = queryAll(db,
            'SELECT id FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
            [txId, userId]
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }

        db.run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [txId, userId]);
        persist();

        return res.status(200).json({ success: true, message: 'Transaction deleted.' });
    } catch (err) {
        console.error('[transactions/delete]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete transaction.' });
    }
}

module.exports = { getAll, getOne, create, update, remove };
