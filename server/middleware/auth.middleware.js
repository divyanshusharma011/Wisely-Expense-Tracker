// ============================================================
//  auth.middleware.js — JWT verification for protected routes
// ============================================================
const jwt    = require('jsonwebtoken');
const config = require('../config/config');

/**
 * protect  —  Express middleware that:
 *   1. Reads the Bearer token from Authorization header
 *   2. Verifies the JWT signature + expiry
 *   3. Attaches decoded payload to req.user
 *   4. Calls next() on success; returns 401 on failure
 */
function protect(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        // Attach minimal user info — full user data is fetched per-request if needed
        req.user = { id: decoded.id, email: decoded.email };
        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Session expired. Please log in again.'
            : 'Invalid token. Please log in again.';

        return res.status(401).json({ success: false, message });
    }
}

module.exports = { protect };
