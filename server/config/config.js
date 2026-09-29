// ============================================================
//  config.js — central configuration loaded from .env
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
    port: parseInt(process.env.PORT, 10) || 5000,

    jwt: {
        secret:         process.env.JWT_SECRET     || 'wisely_dev_secret_change_in_production',
        expiresIn:      process.env.JWT_EXPIRES_IN  || '7d',
        rememberIn:     process.env.JWT_REMEMBER_IN || '30d',
    },

    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
    },

    cors: {
        // Allowed origins — extend in production
        origins: (process.env.CORS_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500').split(','),
    },

    env: process.env.NODE_ENV || 'development',
};

module.exports = config;
