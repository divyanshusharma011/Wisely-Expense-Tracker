// ============================================================
//  google.auth.js — Passport Google OAuth 2.0 strategy
// ============================================================
const passport     = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt          = require('jsonwebtoken');
const { getDb, persist } = require('../db/database');
const config       = require('../config/config');
const { sendWelcomeEmail } = require('./email.service');

function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const db = getDb();
        const email      = profile.emails[0].value.toLowerCase();
        const firstName  = profile.name.givenName  || profile.displayName || 'User';
        const lastName   = profile.name.familyName || '';

        // Check if user already exists
        let [user] = queryAll(db, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);

        let isNewUser = false;

        if (!user) {
            // New user — create account (no password needed for OAuth)
            db.run(
                `INSERT INTO users (first_name, last_name, email, password_hash)
                 VALUES (?, ?, ?, ?)`,
                [firstName, lastName, email, 'GOOGLE_OAUTH']
            );
            persist();
            [user] = queryAll(db, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
            isNewUser = true;
        }

        // Send welcome email only for new users
        if (isNewUser) {
            sendWelcomeEmail(email, firstName).catch(err =>
                console.error('[email] Google welcome email failed:', err.message)
            );
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// Not using sessions — just need to satisfy passport internals
passport.serializeUser((user, done)   => done(null, user.id));
passport.deserializeUser((id, done)   => done(null, { id }));

module.exports = passport;
