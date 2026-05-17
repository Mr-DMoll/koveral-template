import { Router } from "express";
import { Role } from "@repo/types";
import {
  login,
  register,
  logout,
  verifyCode,
  getMe,
  provisionUser,
  setPassword,
  forgotPassword,
  resendVerification,
} from "./auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";
import { authRateLimiter } from "../../middleware/rateLimiter.middleware.js";

const router = Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new client account (sends OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: OTP sent to email
 *       200:
 *         description: OTP resent to returning user
 */
router.post("/register", authRateLimiter, register);

/**
 * @openapi
 * /api/v1/auth/verify-code:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP code and log in (clients)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verified — JWT cookie set
 */
router.post("/verify-code", authRateLimiter, verifyCode);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Staff login (email + password)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in — JWT cookie set
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account suspended or client trying to use password login
 */
router.post("/login", login);

/**
 * @openapi
 * /api/v1/auth/set-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Activate staff account and set password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password set successfully
 *       410:
 *         description: Token expired
 */
router.patch("/set-password", setPassword);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send password reset code (staff only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recovery code sent if account exists
 */
router.post("/forgot-password", forgotPassword);

/**
 * @openapi
 * /api/v1/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP verification code (clients)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code resent
 */
router.post("/resend-verification", authRateLimiter, resendVerification);

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Not authenticated
 */
router.get("/me", protect, getMe);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and clear auth cookies
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", logout);

/**
 * @openapi
 * /api/v1/auth/provision:
 *   post:
 *     tags: [Auth]
 *     summary: Provision a new staff account (SUPER_ADMIN / ADMIN only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, DEVELOPER]
 *     responses:
 *       201:
 *         description: Account created and activation email sent
 *       409:
 *         description: User already exists
 */
router.post(
  "/provision",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN]),
  provisionUser,
);

export default router;