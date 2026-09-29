// ============================================================
//  validate.middleware.js — request body validation helpers
// ============================================================

/**
 * Generic validator factory.
 * Pass an array of { field, type, required, min, max, enum } rules.
 * Returns an Express middleware that validates req.body.
 */
function validate(rules) {
    return (req, res, next) => {
        const errors = [];

        for (const rule of rules) {
            const value = req.body[rule.field];
            const isEmpty = value === undefined || value === null || value === '';

            if (rule.required && isEmpty) {
                errors.push(`${rule.field} is required.`);
                continue;
            }

            if (isEmpty) continue; // optional field, skip further checks

            if (rule.type === 'string' && typeof value !== 'string') {
                errors.push(`${rule.field} must be a string.`);
            }

            if (rule.type === 'number') {
                const num = Number(value);
                if (isNaN(num)) {
                    errors.push(`${rule.field} must be a number.`);
                } else {
                    if (rule.min !== undefined && num < rule.min) {
                        errors.push(`${rule.field} must be at least ${rule.min}.`);
                    }
                    if (rule.max !== undefined && num > rule.max) {
                        errors.push(`${rule.field} must be at most ${rule.max}.`);
                    }
                }
            }

            if (rule.enum && !rule.enum.includes(value)) {
                errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}.`);
            }

            if (rule.minLength && typeof value === 'string' && value.trim().length < rule.minLength) {
                errors.push(`${rule.field} must be at least ${rule.minLength} characters.`);
            }

            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${rule.field} format is invalid.`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        next();
    };
}

// -------------------------
//  Pre-built rule sets
// -------------------------

const VALID_CATEGORIES_TX = [
    // Income
    'Salary', 'Freelance', 'Business', 'Investment',
    // Expense
    'Food', 'Transport', 'Shopping', 'Bills & Utilities',
    'Education', 'Health', 'Entertainment', 'Travel',
    'Rent', 'Other',
];

const VALID_CATEGORIES_BUDGET = [
    'Food', 'Transport', 'Shopping', 'Bills & Utilities',
    'Education', 'Health', 'Entertainment', 'Travel',
    'Rent', 'Other',
];

const VALID_PAYMENT_METHODS = [
    'Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer',
];

const registerRules = [
    { field: 'first_name', type: 'string', required: true, minLength: 1 },
    { field: 'last_name',  type: 'string', required: true, minLength: 1 },
    { field: 'email',      type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { field: 'password',   type: 'string', required: true, minLength: 8 },
];

const loginRules = [
    { field: 'email',    type: 'string', required: true },
    { field: 'password', type: 'string', required: true },
];

const transactionRules = [
    { field: 'type',             type: 'string', required: true,  enum: ['Income', 'Expense'] },
    { field: 'amount',           type: 'number', required: true,  min: 0.01 },
    { field: 'description',      type: 'string', required: false },
    { field: 'category',         type: 'string', required: true,  enum: VALID_CATEGORIES_TX },
    { field: 'payment_method',   type: 'string', required: true,  enum: VALID_PAYMENT_METHODS },
    { field: 'transaction_date', type: 'string', required: true },
];

const budgetRules = [
    { field: 'category', type: 'string', required: true, enum: VALID_CATEGORIES_BUDGET },
    { field: 'amount',   type: 'number', required: true, min: 0.01 },
    { field: 'month',    type: 'number', required: true, min: 1, max: 12 },
    { field: 'year',     type: 'number', required: true, min: 2000 },
];

const savingsGoalRules = [
    { field: 'name',          type: 'string', required: true,  minLength: 1 },
    { field: 'target_amount', type: 'number', required: true,  min: 0.01 },
    { field: 'target_date',   type: 'string', required: false },
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    transactionRules,
    budgetRules,
    savingsGoalRules,
    VALID_CATEGORIES_TX,
    VALID_CATEGORIES_BUDGET,
    VALID_PAYMENT_METHODS,
};
