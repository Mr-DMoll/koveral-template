import { Router } from "express";
import { Role } from "@repo/types";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  updateProjectStatus,
  addProjectMember,
  removeProjectMember,
  deleteProject,
} from "./project.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";

const router = Router();

// All project routes require authentication
router.use(protect);

/**
 * @openapi
 * /api/v1/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects (filtered by role)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [INTAKE, SCOPE_DRAFT, SCOPE_REVIEW, IN_DESIGN, DESIGN_REVIEW, CONTRACT_DRAFT, CONTRACT_REVIEW, ACTIVE, ON_HOLD, COMPLETE, ARCHIVED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get("/", listProjects);

/**
 * @openapi
 * /api/v1/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project (ADMIN / MANAGER only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, clientId]
 *             properties:
 *               name:         { type: string }
 *               description:  { type: string }
 *               clientId:     { type: string }
 *               managerId:    { type: string }
 *               budget:       { type: number }
 *               currency:     { type: string }
 *               startDate:    { type: string, format: date }
 *               deadline:     { type: string, format: date }
 *               repositoryUrl: { type: string }
 *               liveSiteUrl:  { type: string }
 *               figmaUrl:     { type: string }
 *               intakeFormId: { type: string }
 *     responses:
 *       201:
 *         description: Project created
 */
router.post(
  "/",
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  createProject,
);

/**
 * @openapi
 * /api/v1/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get a single project
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
 *         description: Project data
 *       403:
 *         description: No access to this project
 *       404:
 *         description: Project not found
 */
router.get("/:id", getProject);

/**
 * @openapi
 * /api/v1/projects/{id}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update project details (ADMIN / assigned MANAGER)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:         { type: string }
 *               description:  { type: string }
 *               budget:       { type: number }
 *               currency:     { type: string }
 *               startDate:    { type: string, format: date }
 *               deadline:     { type: string, format: date }
 *               repositoryUrl: { type: string }
 *               liveSiteUrl:  { type: string }
 *               figmaUrl:     { type: string }
 *     responses:
 *       200:
 *         description: Project updated
 */
router.patch("/:id", updateProject);

/**
 * @openapi
 * /api/v1/projects/{id}/status:
 *   patch:
 *     tags: [Projects]
 *     summary: Update project status (ADMIN / assigned MANAGER)
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
 *                 enum: [INTAKE, SCOPE_DRAFT, SCOPE_REVIEW, IN_DESIGN, DESIGN_REVIEW, CONTRACT_DRAFT, CONTRACT_REVIEW, ACTIVE, ON_HOLD, COMPLETE, ARCHIVED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/:id/status", updateProjectStatus);

/**
 * @openapi
 * /api/v1/projects/{id}/members:
 *   post:
 *     tags: [Projects]
 *     summary: Add a member to a project (ADMIN / assigned MANAGER)
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
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *               role:   { type: string }
 *     responses:
 *       200:
 *         description: Member added
 */
router.post("/:id/members", addProjectMember);

/**
 * @openapi
 * /api/v1/projects/{id}/members/{userId}:
 *   delete:
 *     tags: [Projects]
 *     summary: Remove a member from a project
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Member removed
 */
router.delete("/:id/members/:userId", removeProjectMember);

/**
 * @openapi
 * /api/v1/projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Delete a project (ADMIN / SUPER_ADMIN only)
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
 *         description: Project deleted
 */
router.delete("/:id", authorize([Role.SUPER_ADMIN, Role.ADMIN]), deleteProject);

export default router;