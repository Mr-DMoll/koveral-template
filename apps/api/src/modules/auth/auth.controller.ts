import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "@repo/database";
import { HttpStatus, OtpType, Role } from "@repo/types";
import { AuthService } from "./auth.service.js";
import { sendVerificationCodeEmail, sendVerificationEmail } from "../../services/mail.service.js";
import { setAuthCookie, setRoleCookie, clearAuthCookie } from "../../utils/cookie.util.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

const authService = new AuthService();

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ARCHITECTURE
//
// CLIENTS    → Passwordless OTP (email only).
//              /register → get OTP → /verify-code → logged in.
//
// STAFF      → Email + password. Provisioned by SUPER_ADMIN or ADMIN.
//   (ADMIN, MANAGER, DEVELOPER)
//              /provision  → creates account + sends activation email
//              /set-password → staff sets their own password
//              /login      → logged in.
// ─────────────────────────────────────────────────────────────────────────────

// ── Staff roles — anyone who is NOT a client ──────────────────────────────────
const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.MANAGER,
  Role.DEVELOPER,
];

// ── OTP helper ────────────────────────────────────────────────────────────────
async function dispatchOtp(userId: string, email: string): Promise<void> {
  // Delete any existing OTPs for this user first
  await prisma.otpCode.deleteMany({ where: { userId } });

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.otpCode.create({
    data: {
      code,
      target:    email,
      type:      OtpType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      userId,
    },
  });

  // Fire and forget — don't await so the response isn't blocked
  sendVerificationCodeEmail(email, code).catch(console.error);
}

// ─── REGISTER (clients — OTP flow) ───────────────────────────────────────────
export const register = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError("Email is required.", HttpStatus.BAD_REQUEST);

  const normalized = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });

  if (existing) {
    // Returning client — resend OTP
    if (STAFF_ROLES.includes(existing.role as Role)) {
      throw new AppError(
        "Staff accounts use email and password to sign in.",
        HttpStatus.FORBIDDEN,
      );
    }

    await dispatchOtp(existing.id, normalized);
    return res.status(HttpStatus.OK).json({
      status:  "success",
      message: `Verification code sent to ${normalized}`,
      data:    { userId: existing.id, isReturning: true },
    });
  }

  // New client — create account with a ghost password (they never use it)
  const ghostPassword = crypto.randomBytes(16).toString("hex");
  const user = await authService.createUser({
    email:    normalized,
    password: ghostPassword,
    role:     Role.CLIENT,
  });

  await dispatchOtp(user.id, normalized);

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: `Verification code sent to ${normalized}`,
    data:    { userId: user.id, isReturning: false },
  });
});

// ─── VERIFY OTP (clients) ─────────────────────────────────────────────────────
export const verifyCode = catchAsync(async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    throw new AppError("Email and code are required.", HttpStatus.BAD_REQUEST);
  }

  const normalized = email.trim().toLowerCase();

  const otp = await prisma.otpCode.findFirst({
    where:   { code: code.trim(), target: normalized },
    include: { user: true },
  });

  if (!otp) {
    throw new AppError("Invalid verification code.", HttpStatus.BAD_REQUEST);
  }

  if (new Date() > otp.expiresAt) {
    await prisma.otpCode.delete({ where: { id: otp.id } });
    throw new AppError(
      "Code has expired. Please request a new one.",
      HttpStatus.GONE,
    );
  }

  // Verify and activate in a single transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: otp.userId },
      data: {
        isEmailVerified: true,
        accountStatus:   "ACTIVE",
      },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, displayName: true,
        avatarUrl: true, accountStatus: true,
        createdAt: true, updatedAt: true,
      },
    });
    await tx.otpCode.delete({ where: { id: otp.id } });
    return u;
  });

  const token = authService.generateToken(updatedUser.id, updatedUser.role);
  setAuthCookie(res, token);
  setRoleCookie(res, updatedUser.role);

  return res.status(HttpStatus.OK).json({
    status:  "success",
    message: "Identity verified. Welcome!",
    data:    { user: updatedUser },
  });
});

// ─── LOGIN (staff only — email + password) ────────────────────────────────────
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required.", HttpStatus.BAD_REQUEST);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    throw new AppError("Invalid credentials.", HttpStatus.UNAUTHORIZED);
  }



  if (user.accountStatus === "SUSPENDED") {
    throw new AppError(
      "Your account has been suspended. Contact your administrator.",
      HttpStatus.FORBIDDEN,
    );
  }

  if (user.accountStatus === "DELETED") {
    throw new AppError("Invalid credentials.", HttpStatus.UNAUTHORIZED);
  }

  const match = await authService.verifyPassword(password, user.password);
  if (!match) {
    throw new AppError("Invalid credentials.", HttpStatus.UNAUTHORIZED);
  }

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data:  { lastActiveAt: new Date() },
  });

  const token = authService.generateToken(user.id, user.role);
  setAuthCookie(res, token);
  setRoleCookie(res, user.role);

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      token,
      user: {
        id:          user.id,
        email:       user.email,
        role:        user.role,
        firstName:   user.firstName,
        lastName:    user.lastName,
        displayName: user.displayName,
        avatarUrl:   user.avatarUrl,
      },
    },
  });
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(HttpStatus.OK).json({
    status:  "success",
    message: "Logged out successfully.",
  });
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
export const getMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Not authenticated", HttpStatus.UNAUTHORIZED);
  }

  const user = await prisma.user.findUnique({
    where:  { id: req.user.userId },
    select: {
      id:              true,
      email:           true,
      role:            true,
      accountStatus:   true,
      isEmailVerified: true,
      firstName:       true,
      lastName:        true,
      displayName:     true,
      avatarUrl:       true,
      language:        true,
      city:            true,
      country:         true,
      dateOfBirth:     true,
      profileCompletedAt: true,
      lastActiveAt:    true,
      createdAt:       true,
      updatedAt:       true,
    },
  });

  if (!user) {
    throw new AppError("User not found", HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { user },
  });
});

// ─── PROVISION STAFF (SUPER_ADMIN / ADMIN only) ───────────────────────────────
export const provisionUser = catchAsync(async (req: Request, res: Response) => {
  const { email, role } = req.body;
  if (!email || !role) {
    throw new AppError("Email and role are required.", HttpStatus.BAD_REQUEST);
  }

  // Cannot provision a SUPER_ADMIN via API
  if (role === Role.SUPER_ADMIN) {
    throw new AppError(
      "Super Admin cannot be provisioned via API.",
      HttpStatus.FORBIDDEN,
    );
  }

  // Cannot provision a CLIENT via provision — they self-register
  if (role === Role.CLIENT) {
    throw new AppError(
      "Clients register themselves via the client portal.",
      HttpStatus.FORBIDDEN,
    );
  }

  // ADMIN can only provision MANAGER and DEVELOPER
  if (
    req.user?.role === Role.ADMIN &&
    ![Role.MANAGER, Role.DEVELOPER].includes(role as Role)
  ) {
    throw new AppError(
      "Admins can only provision Managers and Developers.",
      HttpStatus.FORBIDDEN,
    );
  }

  const normalized = email.trim().toLowerCase();
  const existing   = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    throw new AppError("A user with this email already exists.", HttpStatus.CONFLICT);
  }

  // Create account with temp password — they set their own via activation link
  const tempPassword = crypto.randomBytes(8).toString("hex") + "Aa1!";
  const user = await authService.createUser({
    email:    normalized,
    password: tempPassword,
    role:     role as Role,
  });

  // Generate activation token (stored as an OTP code)
  const activationToken = crypto.randomBytes(32).toString("hex");
  await prisma.otpCode.create({
    data: {
      code:      activationToken,
      target:    normalized,
      type:      OtpType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      userId:    user.id,
    },
  });

  await sendVerificationEmail(normalized, activationToken);

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "USER_PROVISIONED",
      meta:   { provisionedEmail: normalized, provisionedRole: role },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: `Account created. Activation email sent to ${normalized}.`,
  });
});

// ─── SET PASSWORD (staff activation) ─────────────────────────────────────────
export const setPassword = catchAsync(async (req: Request, res: Response) => {
  const { password, token } = req.body;

  if (!token) {
    throw new AppError("Activation token is missing.", HttpStatus.BAD_REQUEST);
  }
  if (!password || password.length < 8) {
    throw new AppError(
      "Password must be at least 8 characters.",
      HttpStatus.BAD_REQUEST,
    );
  }

  const otp = await prisma.otpCode.findUnique({
    where:   { code: token },
    include: { user: true },
  });

  if (!otp || otp.type !== OtpType.EMAIL_VERIFICATION) {
    throw new AppError("Invalid or expired activation link.", HttpStatus.GONE);
  }

  if (new Date() > otp.expiresAt) {
    await prisma.otpCode.delete({ where: { id: otp.id } });
    throw new AppError(
      "Activation link expired. Ask your administrator to resend.",
      HttpStatus.GONE,
    );
  }

  const hashed = await authService.hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: otp.userId },
      data: {
        password:        hashed,
        accountStatus:   "ACTIVE",
        isEmailVerified: true,
      },
    }),
    prisma.otpCode.delete({ where: { id: otp.id } }),
  ]);

  return res.status(HttpStatus.OK).json({
    status:  "success",
    message: "Password set. You can now sign in.",
  });
});

// ─── FORGOT PASSWORD (staff only) ─────────────────────────────────────────────
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError("Email is required.", HttpStatus.BAD_REQUEST);
  }

  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Always return 200 — don't reveal whether an account exists
  if (!user || user.role === Role.CLIENT) {
    return res.status(HttpStatus.OK).json({
      status:  "success",
      message: "If an account exists, a recovery code has been sent.",
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.otpCode.deleteMany({ where: { userId: user.id } });
  await prisma.otpCode.create({
    data: {
      code,
      target:    normalized,
      type:      OtpType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      userId:    user.id,
    },
  });

  sendVerificationCodeEmail(normalized, code).catch(console.error);

  return res.status(HttpStatus.OK).json({
    status:  "success",
    message: "If an account exists, a recovery code has been sent.",
  });
});

// ─── RESEND VERIFICATION (clients) ───────────────────────────────────────────
export const resendVerification = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError("Email is required.", HttpStatus.BAD_REQUEST);
  }

  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    throw new AppError("No account found with this email.", HttpStatus.NOT_FOUND);
  }
  if (user.isEmailVerified) {
    throw new AppError("This account is already verified.", HttpStatus.BAD_REQUEST);
  }

  await dispatchOtp(user.id, normalized);

  return res.status(HttpStatus.OK).json({
    status:  "success",
    message: "Verification code resent.",
  });
});