// ============================================================
//  auth.js — Wisely frontend authentication
//
//  Handles login + signup form behaviour.
//  All actual auth is done via the backend API (api.js).
//  localStorage is used ONLY to cache the JWT token and
//  the user's name/email so pages load without a round-trip.
//  It is NOT the source of truth — the backend DB is.
// ============================================================

// ===========================
//  UTILITY FUNCTIONS
// ===========================
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'success'
                ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
            }
        </svg>
        ${message}
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) { input.classList.add('error'); input.classList.remove('success'); }
    if (error) error.textContent = message;
}

function clearError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.remove('error');
    if (error) error.textContent = '';
}

function setSuccess(inputId) {
    const input = document.getElementById(inputId);
    if (input) { input.classList.remove('error'); input.classList.add('success'); }
}

// ===========================
//  PASSWORD STRENGTH CHECKER
// ===========================
function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels  = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const classes = ['', 'active-weak', 'active-fair', 'active-good', 'active-strong'];
    const colors  = ['', '#DC2626', '#f59e0b', '#22c55e', '#16A34A'];

    return { score, label: levels[score], barClass: classes[score], color: colors[score] };
}

function updateStrengthMeter(password) {
    const strength = checkPasswordStrength(password);
    const bars = document.querySelectorAll('.strength-bar');
    const text = document.getElementById('pw-strength-text');

    bars.forEach((bar, i) => {
        bar.className = 'strength-bar';
        if (i < strength.score) bar.classList.add(strength.barClass);
    });

    if (text) {
        text.textContent = password.length > 0 ? strength.label : '';
        text.style.color = strength.color;
    }

    return strength;
}

// ===========================
//  PASSWORD TOGGLE
// ===========================
function initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        });
    });
}

// ===========================
//  REAL-TIME INPUT VALIDATION
// ===========================
function initRealTimeValidation() {
    ['login-email', 'signup-email'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('blur', () => {
            if (input.value && !validateEmail(input.value)) {
                setError(id, id + '-error', 'Please enter a valid email address');
            } else if (input.value) {
                clearError(id, id + '-error');
                setSuccess(id);
            }
        });
        input.addEventListener('input', () => clearError(id, id + '-error'));
    });

    const signupPw = document.getElementById('signup-password');
    if (signupPw) {
        signupPw.addEventListener('input', () => {
            updateStrengthMeter(signupPw.value);
            clearError('signup-password', 'signup-password-error');
        });
    }

    const confirmPw = document.getElementById('signup-confirm-password');
    if (confirmPw) {
        confirmPw.addEventListener('input', () => {
            clearError('signup-confirm-password', 'signup-confirm-password-error');
            if (confirmPw.value && signupPw && confirmPw.value !== signupPw.value) {
                setError('signup-confirm-password', 'signup-confirm-password-error', 'Passwords do not match');
            } else if (confirmPw.value && signupPw && confirmPw.value === signupPw.value) {
                setSuccess('signup-confirm-password');
            }
        });
    }

    ['signup-firstname', 'signup-lastname'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => clearError(id, id + '-error'));
    });
}

// ===========================
//  BUTTON LOADING STATE
// ===========================
function setButtonLoading(btnId, loading) {
    const btn      = document.getElementById(btnId);
    const btnText  = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    btnText.style.display  = loading ? 'none' : 'inline';
    btnLoader.style.display = loading ? 'inline-flex' : 'none';
}

// ===========================
//  LOGIN HANDLER
// ===========================
function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        let valid = true;

        const email    = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        // Client-side validation (keeps UX instant)
        if (!email) {
            setError('login-email', 'login-email-error', 'Email is required');
            valid = false;
        } else if (!validateEmail(email)) {
            setError('login-email', 'login-email-error', 'Please enter a valid email');
            valid = false;
        } else {
            clearError('login-email', 'login-email-error');
        }

        if (!password) {
            setError('login-password', 'login-password-error', 'Password is required');
            valid = false;
        } else if (password.length < 6) {
            setError('login-password', 'login-password-error', 'Password must be at least 6 characters');
            valid = false;
        } else {
            clearError('login-password', 'login-password-error');
        }

        if (!valid) return;

        setButtonLoading('login-submit-btn', true);

        // ── Call backend API ──
        const result = await AuthAPI.login({ email, password });

        if (result.success) {
            const rememberMe = document.getElementById('remember-me')?.checked ?? true;
            // Save token + user to localStorage (persistent) or sessionStorage
            WiselyAuth.saveSession(result.data.token, result.data.user, rememberMe);

            showToast(`Welcome back, ${result.data.user.first_name}!`, 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            // Map backend error messages to the right field
            const msg = result.message || 'Login failed. Please try again.';
            if (result.status === 401) {
                // Show inline under password — most natural placement
                setError('login-password', 'login-password-error', 'Invalid email or password');
                showToast(msg, 'error');
            } else if (result.status === 0) {
                showToast(msg, 'error');
            } else {
                showToast(msg, 'error');
            }
            setButtonLoading('login-submit-btn', false);
        }
    });
}

// ===========================
//  SIGNUP HANDLER
// ===========================
function initSignupForm() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        let valid = true;

        const firstName      = document.getElementById('signup-firstname').value.trim();
        const lastName       = document.getElementById('signup-lastname').value.trim();
        const email          = document.getElementById('signup-email').value.trim();
        const password       = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const agreeTerms     = document.getElementById('agree-terms').checked;

        // ── Client-side validation ──
        if (!firstName) {
            setError('signup-firstname', 'signup-firstname-error', 'First name is required');
            valid = false;
        } else { clearError('signup-firstname', 'signup-firstname-error'); }

        if (!lastName) {
            setError('signup-lastname', 'signup-lastname-error', 'Last name is required');
            valid = false;
        } else { clearError('signup-lastname', 'signup-lastname-error'); }

        if (!email) {
            setError('signup-email', 'signup-email-error', 'Email is required');
            valid = false;
        } else if (!validateEmail(email)) {
            setError('signup-email', 'signup-email-error', 'Please enter a valid email');
            valid = false;
        } else { clearError('signup-email', 'signup-email-error'); }

        if (!password) {
            setError('signup-password', 'signup-password-error', 'Password is required');
            valid = false;
        } else if (password.length < 8) {
            setError('signup-password', 'signup-password-error', 'Password must be at least 8 characters');
            valid = false;
        } else {
            const strength = checkPasswordStrength(password);
            if (strength.score < 2) {
                setError('signup-password', 'signup-password-error', 'Password is too weak. Add uppercase, numbers, or symbols.');
                valid = false;
            } else { clearError('signup-password', 'signup-password-error'); }
        }

        if (!confirmPassword) {
            setError('signup-confirm-password', 'signup-confirm-password-error', 'Please confirm your password');
            valid = false;
        } else if (confirmPassword !== password) {
            setError('signup-confirm-password', 'signup-confirm-password-error', 'Passwords do not match');
            valid = false;
        } else { clearError('signup-confirm-password', 'signup-confirm-password-error'); }

        if (!agreeTerms) {
            setError('agree-terms', 'agree-terms-error', 'You must agree to the terms');
            valid = false;
        } else { clearError('agree-terms', 'agree-terms-error'); }

        if (!valid) return;

        setButtonLoading('signup-submit-btn', true);

        // ── Call backend API ──
        const result = await AuthAPI.signup({
            first_name: firstName,
            last_name:  lastName,
            email,
            password,
        });

        if (result.success) {
            // Auto-login: save session immediately after signup
            WiselyAuth.saveSession(result.data.token, result.data.user, true);

            showToast('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            const msg = result.message || 'Signup failed. Please try again.';
            if (result.status === 409) {
                // Duplicate email — show inline
                setError('signup-email', 'signup-email-error', 'An account with this email already exists');
            } else if (result.status === 400) {
                showToast(msg, 'error');
            } else {
                showToast(msg, 'error');
            }
            setButtonLoading('signup-submit-btn', false);
        }
    });
}

// ===========================
//  INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initRealTimeValidation();
    initLoginForm();
    initSignupForm();

    // Redirect already-logged-in users away from auth pages
    if (WiselyAuth.isLoggedIn()) {
        window.location.href = '/dashboard';
    }
});

