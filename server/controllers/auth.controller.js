// ============================================================
//  auth.controller.js — register + login handlers
// ============================================================
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getDb, persist } = require('../db/database');
const config = require('../config/config');

// ----------------------------------------------------------------
//  Helper — sign a JWT for a user row
// ----------------------------------------------------------------
function signToken(user, rememberMe = false) {
    return jwt.sign(
        { id: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: rememberMe ? config.jwt.rememberIn : config.jwt.expiresIn }
    );
}

// ----------------------------------------------------------------
//  Helper — run a sql.js SELECT and return rows as plain objects
// ----------------------------------------------------------------
function queryAll(db, sql, params = []) {
    const stmt   = db.prepare(sql);
    const rows   = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

// ----------------------------------------------------------------
//  POST /api/auth/register
// ----------------------------------------------------------------
async function register(req, res) {
    try {
        const { first_name, last_name, email, password } = req.body;
        const db = getDb();

        // Check duplicate email
        const existing = queryAll(db,
            'SELECT id FROM users WHERE email = ? LIMIT 1',
            [email.toLowerCase().trim()]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.',
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, config.bcrypt.saltRounds);

        // Insert user
        db.run(
            `INSERT INTO users (first_name, last_name, email, password_hash)
             VALUES (?, ?, ?, ?)`,
            [
                first_name.trim(),
                last_name.trim(),
                email.toLowerCase().trim(),
                password_hash,
            ]
        );
        persist();

        // Fetch the new user
        const [user] = queryAll(db,
            'SELECT id, first_name, last_name, email, created_at FROM users WHERE email = ? LIMIT 1',
            [email.toLowerCase().trim()]
        );

        const token = signToken(user);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
                token,
                user: {
                    id:         user.id,
                    first_name: user.first_name,
                    last_name:  user.last_name,
                    email:      user.email,
                    created_at: user.created_at,
                },
            },
        });
    } catch (err) {
        console.error('[auth/register]', err.message);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
}

// ----------------------------------------------------------------
//  POST /api/auth/login
// ----------------------------------------------------------------
async function login(req, res) {
    try {
        const { email, password, remember_me = false } = req.body;
        const db = getDb();

        // Find user
        const [user] = queryAll(db,
            'SELECT * FROM users WHERE email = ? LIMIT 1',
            [email.toLowerCase().trim()]
        );
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Verify password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const token = signToken(user, remember_me);

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${user.first_name}!`,
            data: {
                token,
                user: {
                    id:         user.id,
                    first_name: user.first_name,
                    last_name:  user.last_name,
                    email:      user.email,
                    created_at: user.created_at,
                },
            },
        });
    } catch (err) {
        console.error('[auth/login]', err.message);
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
}

// ----------------------------------------------------------------
//  GET /api/auth/me  (protected)
// ----------------------------------------------------------------
function getMe(req, res) {
    try {
        const db = getDb();
        const [user] = queryAll(db,
            'SELECT id, first_name, last_name, email, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({ success: true, data: { user } });
    } catch (err) {
        console.error('[auth/me]', err.message);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
}

module.exports = { register, login, getMe };
