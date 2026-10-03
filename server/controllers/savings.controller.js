// ============================================================
//  savings.controller.js — CRUD for savings goals
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
//  GET /api/savings
// ----------------------------------------------------------------
function getAll(req, res) {
    try {
        const db   = getDb();
        const rows = queryAll(db,
            'SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        return res.status(200).json({ success: true, data: { goals: rows } });
    } catch (err) {
        console.error('[savings/getAll]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch savings goals.' });
    }
}

// ----------------------------------------------------------------
//  GET /api/savings/:id
// ----------------------------------------------------------------
function getOne(req, res) {
    try {
        const db = getDb();
        const [goal] = queryAll(db,
            'SELECT * FROM savings_goals WHERE id = ? AND user_id = ? LIMIT 1',
            [req.params.id, req.user.id]
        );
        if (!goal) {
            return res.status(404).json({ success: false, message: 'Savings goal not found.' });
        }
        return res.status(200).json({ success: true, data: { goal } });
    } catch (err) {
        console.error('[savings/getOne]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch savings goal.' });
    }
}

// ----------------------------------------------------------------
//  POST /api/savings
// ----------------------------------------------------------------
function create(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const { name, target_amount, target_date = null } = req.body;

        db.run(
            'INSERT INTO savings_goals (user_id, name, target_amount, target_date) VALUES (?, ?, ?, ?)',
            [userId, name.trim(), parseFloat(target_amount), target_date || null]
        );

        const [goal] = queryAll(db,
            'SELECT * FROM savings_goals WHERE rowid = last_insert_rowid() AND user_id = ? LIMIT 1',
            [userId]
        );
        persist();

        return res.status(201).json({
            success: true,
            message: 'Savings goal created.',
            data: { goal },
        });
    } catch (err) {
        console.error('[savings/create]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create savings goal.' });
    }
}

// ----------------------------------------------------------------
//  PUT /api/savings/:id
// ----------------------------------------------------------------
function update(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const goalId = req.params.id;

        const [existing] = queryAll(db,
            'SELECT * FROM savings_goals WHERE id = ? AND user_id = ? LIMIT 1',
            [goalId, userId]
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Savings goal not found.' });
        }

        const {
            name          = existing.name,
            target_amount = existing.target_amount,
            target_date   = existing.target_date,
        } = req.body;

        db.run(
            `UPDATE savings_goals SET
               name = ?, target_amount = ?, target_date = ?,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
             WHERE id = ? AND user_id = ?`,
            [name.trim(), parseFloat(target_amount), target_date || null, goalId, userId]
        );
        persist();

        const [updated] = queryAll(db,
            'SELECT * FROM savings_goals WHERE id = ? AND user_id = ? LIMIT 1',
            [goalId, userId]
        );

        return res.status(200).json({ success: true, message: 'Savings goal updated.', data: { goal: updated } });
    } catch (err) {
        console.error('[savings/update]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update savings goal.' });
    }
}

// ----------------------------------------------------------------
//  DELETE /api/savings/:id
// ----------------------------------------------------------------
function remove(req, res) {
    try {
        const db     = getDb();
        const userId = req.user.id;
        const goalId = req.params.id;

        const [existing] = queryAll(db,
            'SELECT id FROM savings_goals WHERE id = ? AND user_id = ? LIMIT 1',
            [goalId, userId]
        );
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Savings goal not found.' });
        }

        db.run('DELETE FROM savings_goals WHERE id = ? AND user_id = ?', [goalId, userId]);
        persist();

        return res.status(200).json({ success: true, message: 'Savings goal deleted.' });
    } catch (err) {
        console.error('[savings/delete]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete savings goal.' });
    }
}

module.exports = { getAll, getOne, create, update, remove };
