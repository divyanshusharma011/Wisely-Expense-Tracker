// ============================================================
//  theme.js — Wisely Light / Dark theme toggle
//  - Landing page: injects into navbar (nav-buttons)
//  - Dashboard: injects into header user area
//  - Auth pages: fixed bottom-right
// ============================================================

(function () {
    const STORAGE_KEY = 'wisely_theme';

    // ── Apply theme immediately before paint (no flicker) ────────
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    const saved = localStorage.getItem(STORAGE_KEY) || 'light';
    applyTheme(saved);

    // ── Build the toggle button ──────────────────────────────────
    function createBtn(theme, mode) {
        const btn = document.createElement('button');
        btn.id        = 'theme-toggle';
        btn.setAttribute('aria-label', 'Toggle dark/light mode');
        btn.setAttribute('title', 'Switch theme');
        btn.innerHTML = getIcon(theme);

        // Base inline styles
        const base = {
            cursor:          'pointer',
            border:          '1.5px solid var(--border, #e2e8f0)',
            borderRadius:    '50%',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            background:      'transparent',
            color:           'var(--text, #0f172a)',
            outline:         'none',
            flexShrink:      '0',
            transition:      'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        };

        if (mode === 'navbar') {
            // Navbar size — fits naturally in header
            Object.assign(base, {
                width:       '40px',
                height:      '40px',
                fontSize:    '18px',
            });
        } else if (mode === 'dashboard') {
            // Dashboard header size
            Object.assign(base, {
                width:       '38px',
                height:      '38px',
                fontSize:    '17px',
            });
        } else {
            // Auth / fallback — fixed bottom-right, bigger
            Object.assign(base, {
                position:    'fixed',
                bottom:      '28px',
                right:       '28px',
                zIndex:      '9998',
                width:       '52px',
                height:      '52px',
                fontSize:    '22px',
                boxShadow:   '0 4px 20px rgba(0,0,0,0.15)',
                background:  'var(--surface, #fff)',
            });
        }

        Object.assign(btn.style, base);

        // Hover
        btn.addEventListener('mouseenter', () => {
            btn.style.borderColor = 'var(--primary, #2563eb)';
            btn.style.color       = 'var(--primary, #2563eb)';
            btn.style.transform   = 'rotate(15deg) scale(1.1)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.borderColor = 'var(--border, #e2e8f0)';
            btn.style.color       = 'var(--text, #0f172a)';
            btn.style.transform   = 'rotate(0deg) scale(1)';
        });

        // Click
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next    = current === 'light' ? 'dark' : 'light';
            applyTheme(next);
            localStorage.setItem(STORAGE_KEY, next);
            btn.innerHTML = getIcon(next);
            // Quick pop animation
            btn.style.transform = 'scale(0.8) rotate(20deg)';
            setTimeout(() => {
                btn.style.transform = 'scale(1) rotate(0deg)';
            }, 200);
        });

        return btn;
    }

    // ── Inject after DOM is ready ────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const theme = localStorage.getItem(STORAGE_KEY) || 'light';

        // 1. Landing page — inject into .nav-buttons (before last child)
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            const btn = createBtn(theme, 'navbar');
            // Insert before the "Get Started" button (last item)
            const last = navButtons.lastElementChild;
            navButtons.insertBefore(btn, last);
            return;
        }

        // 2. Dashboard — inject into .dash-user (before logout button)
        const dashUser = document.querySelector('.dash-user');
        if (dashUser) {
            const btn = createBtn(theme, 'dashboard');
            const logout = document.getElementById('logout-btn');
            if (logout) {
                dashUser.insertBefore(btn, logout);
            } else {
                dashUser.appendChild(btn);
            }
            return;
        }

        // 3. Auth pages (login/signup) — fixed bottom-right
        const btn = createBtn(theme, 'fixed');
        document.body.appendChild(btn);
    });

    // ── Icon helpers ─────────────────────────────────────────────
    function getIcon(theme) {
        if (theme === 'dark') {
            // Sun
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/>
                      <line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>`;
        }
        // Moon
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>`;
    }
})();
