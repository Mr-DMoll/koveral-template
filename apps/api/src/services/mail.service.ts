import { Resend } from "resend";
import env from "../config/env.config.js";

const resend = new Resend(env.RESEND_API_KEY);

// ── Brand colours ─────────────────────────────────────────────────────────────
const C = {
  primary: "#84CC16",  // O-Bit lime green (matches your UI)
  dark:    "#0F172A",  // slate-900
  white:   "#FFFFFF",
  muted:   "#94A3B8",  // slate-400
  border:  "#1E293B",  // slate-800
  tint:    "#1A2F0A",  // dark green tint
};

// ─── OTP CODE EMAIL (clients) ─────────────────────────────────────────────────
export const sendVerificationCodeEmail = async (
  email: string,
  code: string,
): Promise<void> => {
  await resend.emails.send({
    from:    `O-Bit <${env.SENDER_EMAIL}>`,
    to:      email,
    subject: `${code} — Your O-Bit verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0F172A;border-radius:12px;overflow:hidden">
        <div style="padding:32px;text-align:center;border-bottom:1px solid ${C.border}">
          <h1 style="color:${C.primary};margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px">O-Bit</h1>
          <p style="color:${C.muted};margin:8px 0 0;font-size:14px">Agency Platform</p>
        </div>
        <div style="padding:40px;text-align:center">
          <p style="color:${C.white};font-size:16px;margin:0 0 8px">Your verification code</p>
          <p style="color:${C.muted};font-size:14px;margin:0 0 32px">Expires in <strong style="color:${C.white}">15 minutes</strong></p>
          <div style="background:${C.tint};border:1px solid ${C.primary};padding:28px;border-radius:12px;margin:0 0 32px">
            <span style="font-size:48px;font-weight:900;letter-spacing:16px;color:${C.primary}">${code}</span>
          </div>
          <p style="color:${C.muted};font-size:13px;margin:0">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
};

// ─── STAFF ACTIVATION EMAIL ───────────────────────────────────────────────────
export const sendVerificationEmail = async (
  email: string,
  token: string,
): Promise<void> => {
  const activationUrl = `${env.FRONTEND_URL}/set-password?token=${token}`;

  await resend.emails.send({
    from:    `O-Bit <${env.SENDER_EMAIL}>`,
    to:      email,
    subject: "You've been invited to O-Bit — Activate your account",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F172A;border-radius:12px;overflow:hidden">
        <div style="padding:32px;text-align:center;border-bottom:1px solid ${C.border}">
          <h1 style="color:${C.primary};margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px">O-Bit</h1>
          <p style="color:${C.muted};margin:8px 0 0;font-size:14px">Agency Platform</p>
        </div>
        <div style="padding:40px">
          <h2 style="color:${C.white};margin:0 0 16px;font-size:20px">You've been granted access</h2>
          <p style="color:${C.muted};margin:0 0 32px;line-height:1.6">
            You've been added to the O-Bit agency platform. Click the button below to activate your account and set your password.
          </p>
          <div style="text-align:center;margin:0 0 32px">
            <a href="${activationUrl}"
              style="background:${C.primary};color:#0F172A;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
              Activate Account →
            </a>
          </div>
          <p style="color:${C.muted};font-size:13px;margin:0;line-height:1.6">
            This link expires in <strong style="color:${C.white}">48 hours</strong>.<br>
            Can't click the button? Copy this link:<br>
            <span style="color:${C.primary};word-break:break-all">${activationUrl}</span>
          </p>
        </div>
      </div>
    `,
  });
};