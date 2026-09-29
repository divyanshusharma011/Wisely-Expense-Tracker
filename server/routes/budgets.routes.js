// ============================================================
//  budgets.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const { getAll, getOne, create, update, remove } = require('../controllers/budgets.controller');
const { protect }                                 = require('../middleware/auth.middleware');
const { validate, budgetRules }                   = require('../middleware/validate.middleware');

router.use(protect);

router.get('/',    getAll);
router.get('/:id', getOne);
router.post('/',   validate(budgetRules), create);
router.put('/:id', validate(budgetRules), update);
router.delete('/:id', remove);

module.exports = router;
