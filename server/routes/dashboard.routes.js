// ============================================================
//  dashboard.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
    getSummary,
    getCategoryBreakdown,
    getMonthlyFlow,
    getRecentTransactions,
} = require('../controllers/dashboard.controller');

router.use(protect);

router.get('/summary',               getSummary);
router.get('/category-breakdown',    getCategoryBreakdown);
router.get('/monthly-flow',          getMonthlyFlow);
router.get('/recent-transactions',   getRecentTransactions);

module.exports = router;
