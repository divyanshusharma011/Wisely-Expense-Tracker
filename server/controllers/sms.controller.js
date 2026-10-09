// ============================================================
//  sms.controller.js — Receive SMS, parse, auto-log transaction
// ============================================================
const { getDb, persist } = require('../db/database');
const { parseSMS }       = require('../services/sms.parser');

function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

// POST /api/sms/parse
// Body: { sms: "Your bank SMS text here" }
function parseSms(req, res) {
    try {
        const { sms } = req.body;

        if (!sms || typeof sms !== 'string' || sms.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'SMS text is required.',
            });
        }

        const parsed = parseSMS(sms.trim());

        if (!parsed.parsed || !parsed.amount) {
            return res.status(422).json({
                success: false,
                message: 'Could not extract transaction details from this SMS.',
                hint:    'Make sure it is a bank transaction SMS.',
                parsed,
            });
        }

        // Save transaction to DB
        const db     = getDb();
        const userId = req.user.id;

        db.run(
            `INSERT INTO transactions
               (user_id, type, amount, description, category, payment_method, transaction_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                parsed.type,
                parsed.amount,
                parsed.description,
                parsed.category,
                parsed.payment_method,
                parsed.transaction_date,
            ]
        );
        persist();

        const [tx] = queryAll(db,
            'SELECT * FROM transactions WHERE rowid = last_insert_rowid() AND user_id = ? LIMIT 1',
            [userId]
        );

        return res.status(201).json({
            success: true,
            message: `Transaction logged: ${parsed.type} ₹${parsed.amount} in ${parsed.category}`,
            data: {
                transaction: tx,
                parsed,
            },
        });
    } catch (err) {
        console.error('[sms/parse]', err.message);
        return res.status(500).json({ success: false, message: 'Failed to parse SMS.' });
    }
}

// POST /api/sms/preview
// Same as parse but does NOT save — just returns what would be detected
function previewSms(req, res) {
    try {
        const { sms } = req.body;
        if (!sms) return res.status(400).json({ success: false, message: 'SMS text required.' });

        const parsed = parseSMS(sms.trim());
        return res.status(200).json({ success: true, data: parsed });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to preview SMS.' });
    }
}

module.exports = { parseSms, previewSms };
