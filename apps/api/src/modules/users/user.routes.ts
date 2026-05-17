import { Router } from "express";
import { Role } from "@repo/types";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  provisionStaff,
  resendMagicLink,
  updateUserRole,
  updateUserStatus,
  updateProfile,
  getAvatarPresignedUrl,
} from "./user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";

const router = Router();

// ─── PROFILE (self) ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/users/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Update own profile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:   { type: string }
 *               lastName:    { type: string }
 *               displayName: { type: string }
 *               avatarUrl:   { type: string }
 *               language:    { type: string }
 *               city:        { type: string }
 *               country:     { type: string }
 *               dateOfBirth: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Not authenticated
 */
router.patch("/profile", protect, updateProfile);

/**
 * @openapi
 * /api/v1/users/profile/avatar/presign:
 *   post:
 *     tags: [Users]
 *     summary: Get presigned URL for avatar upload
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, fileType]
 *             properties:
 *               fileName: { type: string }
 *               fileType: { type: string }
 *     responses:
 *       200:
 *         description: Presigned URL returned
 */
router.post("/profile/avatar/presign", protect, getAvatarPresignedUrl);

// ─── ADMIN OPERATIONS ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (SUPER_ADMIN / ADMIN only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, MANAGER, DEVELOPER, CLIENT]
 *         description: Filter by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, SUSPENDED, DELETED]
 *         description: Filter by account status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email, first name, or last name
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  getAllUsers,
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (SUPER_ADMIN / ADMIN only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN]),
  getUserById,
);

/**
 * @openapi
 * /api/v1/users/provision:
 *   post:
 *     tags: [Users]
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
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, DEVELOPER]
 *     responses:
 *       201:
 *         description: Account provisioned and activation email sent
 *       409:
 *         description: User already exists
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/provision",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  provisionStaff,
);

/**
 * @openapi
 * /api/v1/users/resend-invite:
 *   post:
 *     tags: [Users]
 *     summary: Resend activation email to pending staff (SUPER_ADMIN / ADMIN only)
 *     security:
 *       - cookieAuth: []
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
 *       200:
 *         description: Invite resent
 *       404:
 *         description: User not found
 *       400:
 *         description: Account already active
 */
router.post(
  "/resend-invite",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  resendMagicLink,
);

/**
 * @openapi
 * /api/v1/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Update user account status (SUPER_ADMIN / ADMIN only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED, DELETED]
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: User not found
 *       403:
 *         description: Cannot modify Super Admin
 */
router.patch(
  "/:id/status",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN]),
  updateUserStatus,
);

/**
 * @openapi
 * /api/v1/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update user role (SUPER_ADMIN / ADMIN only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, DEVELOPER, CLIENT]
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Cannot assign Super Admin role
 */
router.patch(
  "/:id/role",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN]),
  updateUserRole,
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (SUPER_ADMIN / ADMIN only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted
 *       403:
 *         description: Cannot delete Super Admin or yourself
 *       404:
 *         description: User not found
 */
router.delete(
  "/:id",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN]),
  deleteUser,
);

export default router;