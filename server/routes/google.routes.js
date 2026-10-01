// ============================================================
//  google.routes.js — Google OAuth routes
//  GET /auth/google          → redirect to Google login
//  GET /auth/google/callback → Google redirects back here
// ============================================================
const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const passport = require('../services/google.auth');
const config   = require('../config/config');

// Step 1 — redirect user to Google
router.get('/', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    prompt: 'select_account',   // ← always show account chooser
}));

// Step 2 — Google calls back here with user profile
router.get('/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_failed' }),
    (req, res) => {
        try {
            const user = req.user;

            // Issue our own JWT
            const token = jwt.sign(
                { id: user.id, email: user.email },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );

            // Pass token to frontend via URL param — JS will pick it up and store it
            res.redirect(`/dashboard?token=${token}&first_name=${encodeURIComponent(user.first_name)}&last_name=${encodeURIComponent(user.last_name)}&email=${encodeURIComponent(user.email)}&id=${user.id}`);
        } catch (err) {
            console.error('[google/callback]', err.message);
            res.redirect('/login?error=google_failed');
        }
    }
);

module.exports = router;
