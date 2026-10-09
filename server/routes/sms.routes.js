// ============================================================
//  sms.routes.js
//  POST /api/sms/parse    — parse + auto-log transaction
//  POST /api/sms/preview  — parse only, don't save
// ============================================================
const express         = require('express');
const router          = express.Router();
const { protect }     = require('../middleware/auth.middleware');
const { parseSms, previewSms } = require('../controllers/sms.controller');

router.use(protect);

router.post('/parse',   parseSms);
router.post('/preview', previewSms);

module.exports = router;
