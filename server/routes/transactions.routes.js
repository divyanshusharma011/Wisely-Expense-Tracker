// ============================================================
//  transactions.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const { getAll, getOne, create, update, remove } = require('../controllers/transactions.controller');
const { protect }                                 = require('../middleware/auth.middleware');
const { validate, transactionRules }              = require('../middleware/validate.middleware');

// All transaction routes require authentication
router.use(protect);

router.get('/',    getAll);
router.get('/:id', getOne);
router.post('/',   validate(transactionRules), create);
router.put('/:id', validate(transactionRules), update);
router.delete('/:id', remove);

module.exports = router;
