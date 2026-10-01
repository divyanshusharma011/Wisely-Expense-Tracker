// ============================================================
//  email.service.js — Wisely transactional emails via Resend
//  In development/test mode, all emails are delivered to
//  RESEND_TEST_EMAIL (your own Gmail) regardless of recipient.
//  After domain verification + production, emails go to real users.
// ============================================================
const { Resend } = require('resend');

const resend    = new Resend(process.env.RESEND_API_KEY);
const FROM      = process.env.EMAIL_FROM || 'Wisely Finance <onboarding@resend.dev>';
const APP_URL   = process.env.APP_URL    || 'http://localhost:5000';

// In test mode (no custom domain), Resend only delivers to your
// own verified email. Set RESEND_TEST_EMAIL in .env to override recipient.
const TEST_EMAIL = process.env.RESEND_TEST_EMAIL || null;

function getRecipient(to) {
    // If test email is set, always send there (Resend free tier limitation)
    return TEST_EMAIL || to;
}

// ── Shared HTML wrapper ──────────────────────────────────────────
function emailWrapper(content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wisely</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding:0 0 24px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:12px;padding:14px 28px;">
                  <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                    <span style="font-size:28px;">W</span>isely
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:20px;padding:48px 48px 40px;
                     box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:28px 0 0 0;">
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
              © 2026 Wisely. All rights reserved.<br>
              Smart Personal Finance &amp; Expense Tracker
            </p>
            <p style="margin:12px 0 0 0;font-size:12px;color:#cbd5e1;">
              You received this email because you have an account on Wisely.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(text, url) {
    return `
    <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr>
        <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:10px;">
          <a href="${url}"
             style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;
                    color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

// ============================================================
//  sendWelcomeEmail
// ============================================================
async function sendWelcomeEmail(to, firstName) {
    const recipient = getRecipient(to);

    const html = emailWrapper(`
      <h1 style="margin:0 0 8px 0;font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
        Welcome to Wisely, ${firstName}! 🎉
      </h1>
      <p style="margin:0 0 24px 0;font-size:16px;color:#64748b;line-height:1.6;">
        Your account is ready. You're now part of a smarter way to manage money.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f8f9fc;border-radius:12px;padding:24px;margin:0 0 8px 0;">
        <tr><td>
          <p style="margin:0 0 16px 0;font-size:13px;font-weight:700;color:#0f172a;
                    text-transform:uppercase;letter-spacing:0.5px;">What you can do</p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:6px 0;font-size:14px;color:#475569;">💰 &nbsp;Track every income &amp; expense</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#475569;">📊 &nbsp;Set monthly budgets per category</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#475569;">🎯 &nbsp;Create savings goals with deadlines</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#475569;">📈 &nbsp;Visualise your financial analytics</td></tr>
          </table>
        </td></tr>
      </table>
      ${ctaButton('Open My Dashboard →', `${APP_URL}/dashboard`)}
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
        If you didn't create this account, you can safely ignore this email.
      </p>
    `);

    const result = await resend.emails.send({
        from:    FROM,
        to:      [recipient],
        subject: `Welcome to Wisely, ${firstName}! 🎉`,
        html,
    });

    if (result.error) throw new Error(result.error.message);
    console.log(`[email] Welcome email sent to ${recipient}`);
    return result;
}

// ============================================================
//  sendLoginNotificationEmail
// ============================================================
async function sendLoginNotificationEmail(to, firstName) {
    const recipient = getRecipient(to);

    const timeStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone:  'Asia/Kolkata',
    });

    const html = emailWrapper(`
      <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
        New login to your Wisely account
      </h1>
      <p style="margin:0 0 24px 0;font-size:16px;color:#64748b;line-height:1.6;">
        Hi ${firstName}, we noticed a new sign-in to your account.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f8f9fc;border-radius:12px;padding:24px;margin:0 0 24px 0;">
        <tr><td>
          <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#94a3b8;
                    text-transform:uppercase;letter-spacing:0.5px;">Login time</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${timeStr} IST</p>
        </td></tr>
      </table>
      <p style="margin:0 0 8px 0;font-size:14px;color:#475569;line-height:1.6;">
        If this was you, no action is needed.
      </p>
      <p style="margin:0 0 24px 0;font-size:14px;color:#ef4444;font-weight:600;">
        If this wasn't you, secure your account immediately.
      </p>
      ${ctaButton('Go to Dashboard →', `${APP_URL}/dashboard`)}
    `);

    const result = await resend.emails.send({
        from:    FROM,
        to:      [recipient],
        subject: `New login to your Wisely account — ${timeStr}`,
        html,
    });

    if (result.error) throw new Error(result.error.message);
    console.log(`[email] Login notification sent to ${recipient}`);
    return result;
}

module.exports = { sendWelcomeEmail, sendLoginNotificationEmail };
