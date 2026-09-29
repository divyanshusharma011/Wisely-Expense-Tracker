// ============================================================
//  auth.routes.js
// ============================================================
const express  = require('express');
const router   = express.Router();

const { register, login, getMe } = require('../controllers/auth.controller');
const { protect }                 = require('../middleware/auth.middleware');
const { validate, registerRules, loginRules } = require('../middleware/validate.middleware');

// POST /api/auth/register  (original)
router.post('/register', validate(registerRules), register);

// POST /api/auth/signup  (frontend-facing alias for register)
router.post('/signup', validate(registerRules), register);

// POST /api/auth/login
router.post('/login', validate(loginRules), login);

// POST /api/auth/logout  (stateless JWT — client drops the token;
//                         endpoint exists so the frontend has a clean
//                         call to make and future token-blacklist logic
//                         can be added here without changing the frontend)
router.post('/logout', protect, (req, res) => {
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// GET  /api/auth/me  (protected)
router.get('/me', protect, getMe);

module.exports = router;
