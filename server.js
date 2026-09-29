// ============================================================
//  server.js — Wisely API + Static file server
//  Run with:  node server.js
//  Frontend:  http://localhost:5000
//  API:       http://localhost:5000/api
// ============================================================
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const config   = require('./server/config/config');
const { initDatabase } = require('./server/db/database');

// ----------------------------------------------------------------
//  Bootstrap: init DB first, then start Express
// ----------------------------------------------------------------
(async () => {
    try {
        console.log('\n  Wisely — starting up…');
        await initDatabase();

        const app = express();

        // --------------------------------------------------------
        //  CORS — allow file:// and any localhost origin
        // --------------------------------------------------------
        app.use(cors({
            origin: (origin, callback) => {
                if (!origin || origin === 'null') return callback(null, true);
                const allowed = [
                    ...config.cors.origins,
                    /^http:\/\/localhost(:\d+)?$/,
                    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
                ];
                const ok = allowed.some(a =>
                    typeof a === 'string' ? a === origin : a.test(origin)
                );
                callback(ok ? null : new Error(`CORS blocked: ${origin}`), ok);
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        }));

        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));

        // --------------------------------------------------------
        //  Serve client/ as static files
        //  http://localhost:5000        → client/pages/index.html
        //  http://localhost:5000/login  → client/pages/login.html
        // --------------------------------------------------------
        const clientPages = path.join(__dirname, 'client', 'pages');
        const clientRoot  = path.join(__dirname, 'client');

        // Static assets (css, js, assets)
        app.use('/css',    express.static(path.join(clientRoot, 'css')));
        app.use('/js',     express.static(path.join(clientRoot, 'js')));
        app.use('/assets', express.static(path.join(clientRoot, 'assets')));

        // Page routes
        app.get('/',          (req, res) => res.sendFile(path.join(clientPages, 'index.html')));
        app.get('/login',     (req, res) => res.sendFile(path.join(clientPages, 'login.html')));
        app.get('/signup',    (req, res) => res.sendFile(path.join(clientPages, 'signup.html')));
        app.get('/dashboard', (req, res) => res.sendFile(path.join(clientPages, 'dashboard.html')));

        // --------------------------------------------------------
        //  API routes
        // --------------------------------------------------------
        app.use('/api/auth',         require('./server/routes/auth.routes'));
        app.use('/api/transactions', require('./server/routes/transactions.routes'));
        app.use('/api/budgets',      require('./server/routes/budgets.routes'));
        app.use('/api/savings',      require('./server/routes/savings.routes'));
        app.use('/api/dashboard',    require('./server/routes/dashboard.routes'));

        // --------------------------------------------------------
        //  Health check
        // --------------------------------------------------------
        app.get('/api/health', (req, res) => {
            res.status(200).json({
                success:   true,
                message:   'Wisely API is running.',
                env:       config.env,
                timestamp: new Date().toISOString(),
            });
        });

        // --------------------------------------------------------
        //  404 — API routes return JSON, page routes serve index
        // --------------------------------------------------------
        app.use((req, res) => {
            if (req.path.startsWith('/api')) {
                return res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
            }
            res.sendFile(path.join(clientPages, 'index.html'));
        });

        // --------------------------------------------------------
        //  Global error handler
        // --------------------------------------------------------
        app.use((err, req, res, next) => {
            console.error('[Unhandled error]', err.message);
            res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
        });

        // --------------------------------------------------------
        //  Start listening
        // --------------------------------------------------------
        app.listen(config.port, () => {
            console.log(`\n  ✓ Wisely running at   http://localhost:${config.port}`);
            console.log(`  ✓ API health check    http://localhost:${config.port}/api/health`);
            console.log(`  ✓ Dashboard           http://localhost:${config.port}/dashboard\n`);
        });

    } catch (err) {
        console.error('\n  [FATAL] Server failed to start:', err.message);
        process.exit(1);
    }
})();
