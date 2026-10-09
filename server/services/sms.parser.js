// ============================================================
//  sms.parser.js — Smart SMS parser for bank transactions
//  Parses Indian bank SMS and auto-categorizes by merchant
// ============================================================

// ── Amount extraction ────────────────────────────────────────
function extractAmount(sms) {
    const patterns = [
        /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
        /([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)/i,
        /debited.*?([\d,]+(?:\.\d{1,2})?)/i,
        /credited.*?([\d,]+(?:\.\d{1,2})?)/i,
        /spent.*?([\d,]+(?:\.\d{1,2})?)/i,
        /payment.*?of.*?([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of patterns) {
        const match = sms.match(pattern);
        if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            if (amount > 0) return amount;
        }
    }
    return null;
}

// ── Transaction type (Income/Expense) ────────────────────────
function extractType(sms) {
    const lower = sms.toLowerCase();

    const incomeKeywords = [
        'credited', 'credit', 'received', 'refund',
        'cashback', 'salary', 'deposited', 'added',
        'reversed', 'reversal',
    ];

    const expenseKeywords = [
        'debited', 'debit', 'spent', 'payment', 'paid',
        'purchase', 'withdrawn', 'transferred', 'sent',
    ];

    for (const k of incomeKeywords) {
        if (lower.includes(k)) return 'Income';
    }
    for (const k of expenseKeywords) {
        if (lower.includes(k)) return 'Expense';
    }

    return 'Expense'; // default
}

// ── Merchant extraction ──────────────────────────────────────
function extractMerchant(sms) {
    const patterns = [
        /(?:at|to|from|via|merchant[:\s]+)([A-Z][A-Za-z0-9\s&'.,-]{2,30}?)(?:\s+on|\s+ref|\s+upi|\s+txn|\.|\n|$)/i,
        /UPI[:/\s]+[\w]+[:/\s]+([\w\s&'.,-]{3,25})/i,
        /(?:paid|payment)\s+(?:to|at)\s+([A-Za-z0-9\s&'.,-]{3,25})/i,
    ];

    for (const p of patterns) {
        const m = sms.match(p);
        if (m && m[1]) {
            const merchant = m[1].trim().replace(/[^a-zA-Z0-9\s&'.-]/g, '');
            if (merchant.length > 2) return merchant;
        }
    }
    return null;
}

// ── Smart category mapping ───────────────────────────────────
const CATEGORY_MAP = [
    {
        category: 'Food',
        keywords: [
            'swiggy', 'zomato', 'dominos', 'domino', "mcdonald", 'mcdonalds',
            'kfc', 'pizza', 'burger', 'restaurant', 'cafe', 'coffee',
            'starbucks', 'cafe coffee', 'blinkit', 'zepto', 'dunzo',
            'hotel', 'dhaba', 'biryani', 'food', 'eat', 'kitchen',
            'bakery', 'sweet', 'haldiram', 'momo', 'subway',
        ],
    },
    {
        category: 'Transport',
        keywords: [
            'uber', 'ola', 'rapido', 'metro', 'irctc', 'railways',
            'petrol', 'fuel', 'diesel', 'pump', 'hp petrol', 'indian oil',
            'parking', 'toll', 'fastag', 'bus', 'auto', 'cab',
            'rapido', 'yulu', 'bounce', 'blablacar',
        ],
    },
    {
        category: 'Shopping',
        keywords: [
            'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho',
            'snapdeal', 'shopify', 'mall', 'dmart', 'big bazaar',
            'reliance', 'trends', 'westside', 'pantaloons', 'zara',
            'h&m', 'max fashion', 'lifestyle', 'decathlon', 'ikea',
            'firstcry', 'hopscotch', 'shop', 'store', 'mart',
        ],
    },
    {
        category: 'Entertainment',
        keywords: [
            'netflix', 'spotify', 'youtube', 'prime', 'hotstar',
            'disney', 'zee5', 'sonyliv', 'pvr', 'inox', 'cinepolis',
            'bookmyshow', 'gaming', 'steam', 'playstation', 'xbox',
            'gaana', 'jiosaavn', 'apple music', 'movie', 'cinema',
            'concert', 'event', 'ticketmaster', 'lenskart',
        ],
    },
    {
        category: 'Health',
        keywords: [
            'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg',
            'hospital', 'clinic', 'pharmacy', 'medical', 'doctor',
            'health', 'diagnostic', 'lab', 'pathology', 'dr.',
            'nursing', 'medicine', 'tablet', 'injection', 'test',
        ],
    },
    {
        category: 'Bills & Utilities',
        keywords: [
            'electricity', 'bescom', 'mseb', 'tata power', 'adani electric',
            'jio', 'airtel', 'vi ', 'vodafone', 'idea', 'bsnl',
            'broadband', 'internet', 'water', 'gas', 'lpg',
            'indane', 'hp gas', 'bharat gas', 'recharge', 'dth',
            'tata sky', 'dish tv', 'utility', 'bill', 'electricity',
        ],
    },
    {
        category: 'Education',
        keywords: [
            'udemy', 'coursera', 'unacademy', 'byju', 'vedantu',
            'college', 'school', 'university', 'fees', 'tuition',
            'coaching', 'classes', 'institute', 'education', 'book',
            'amazon kindle', 'chegg', 'toppr',
        ],
    },
    {
        category: 'Travel',
        keywords: [
            'makemytrip', 'goibibo', 'yatra', 'cleartrip', 'ixigo',
            'airbnb', 'oyo', 'hotel booking', 'flight', 'airline',
            'indigo', 'air india', 'spicejet', 'vistara', 'akasa',
            'redbus', 'abhibus', 'travel', 'trip', 'holiday',
        ],
    },
    {
        category: 'Rent',
        keywords: [
            'rent', 'pg ', 'paying guest', 'society', 'maintenance',
            'housing', 'flat', 'apartment', 'landlord',
        ],
    },
];

function detectCategory(sms, merchant, type) {
    // Income type — check for salary
    if (type === 'Income') {
        const lower = sms.toLowerCase();
        if (lower.includes('salary') || lower.includes('payroll')) return 'Salary';
        if (lower.includes('refund') || lower.includes('cashback')) return 'Other';
        return 'Other';
    }

    // Combine SMS + merchant for keyword search
    const text = (sms + ' ' + (merchant || '')).toLowerCase();

    for (const entry of CATEGORY_MAP) {
        for (const keyword of entry.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return entry.category;
            }
        }
    }

    return 'Other';
}

// ── Payment method detection ─────────────────────────────────
function detectPaymentMethod(sms) {
    const lower = sms.toLowerCase();
    if (lower.includes('upi'))                              return 'UPI';
    if (lower.includes('credit card') || lower.includes('cc ')) return 'Credit Card';
    if (lower.includes('debit card') || lower.includes('dc '))  return 'Debit Card';
    if (lower.includes('neft') || lower.includes('imps') || lower.includes('rtgs')) return 'Bank Transfer';
    if (lower.includes('cash'))                             return 'Cash';
    return 'UPI'; // Most Indian transactions are UPI
}

// ── Date extraction ──────────────────────────────────────────
function extractDate(sms) {
    const patterns = [
        /(\d{2}[-/]\d{2}[-/]\d{2,4})/,
        /(\d{2}\s+\w{3}\s+\d{2,4})/i,
        /on\s+(\d{2}[-/]\d{2}[-/]\d{2,4})/i,
    ];

    for (const p of patterns) {
        const m = sms.match(p);
        if (m) {
            try {
                const d = new Date(m[1].replace(/-/g, '/'));
                if (!isNaN(d)) {
                    return d.toISOString().slice(0, 10);
                }
            } catch {}
        }
    }

    // Default to today
    return new Date().toISOString().slice(0, 10);
}

// ── Main parse function ──────────────────────────────────────
function parseSMS(smsText) {
    const amount          = extractAmount(smsText);
    const type            = extractType(smsText);
    const merchant        = extractMerchant(smsText);
    const category        = detectCategory(smsText, merchant, type);
    const payment_method  = detectPaymentMethod(smsText);
    const transaction_date = extractDate(smsText);
    const description     = merchant || (type === 'Income' ? 'Credit received' : 'Bank transaction');

    return {
        parsed: !!amount,
        amount,
        type,
        description,
        category,
        payment_method,
        transaction_date,
        raw_merchant: merchant,
    };
}

module.exports = { parseSMS };
