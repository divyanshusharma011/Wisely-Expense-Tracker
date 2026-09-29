// ============================================================
//  savings.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const { getAll, getOne, create, update, remove } = require('../controllers/savings.controller');
const { protect }                                 = require('../middleware/auth.middleware');
const { validate, savingsGoalRules }              = require('../middleware/validate.middleware');

router.use(protect);

router.get('/',    getAll);
router.get('/:id', getOne);
router.post('/',   validate(savingsGoalRules), create);
router.put('/:id', validate(savingsGoalRules), update);
router.delete('/:id', remove);

module.exports = router;
