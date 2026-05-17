import { Router } from "express";
import {
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  submitMilestone,
  approveMilestone,
  rejectMilestone,
  deleteMilestone,
} from "./milestone.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

// Mounted at /api/v1/projects/:projectId/milestones
const router = Router({ mergeParams: true });

router.use(protect);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones:
 *   get:
 *     tags: [Milestones]
 *     summary: List all milestones for a project
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of milestones
 */
router.get("/", listMilestones);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones:
 *   post:
 *     tags: [Milestones]
 *     summary: Create a milestone (manager / admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:        { type: string }
 *               description:  { type: string }
 *               agreedAmount: { type: number }
 *               dueDate:      { type: string, format: date }
 *               deliverables: { type: array, items: { type: string } }
 *               order:        { type: number }
 *     responses:
 *       201:
 *         description: Milestone created
 */
router.post("/", createMilestone);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones/{id}:
 *   get:
 *     tags: [Milestones]
 *     summary: Get a single milestone
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Milestone data
 */
router.get("/:id", getMilestone);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones/{id}:
 *   patch:
 *     tags: [Milestones]
 *     summary: Update a milestone (manager / admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
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
 *               title:        { type: string }
 *               description:  { type: string }
 *               agreedAmount: { type: number }
 *               dueDate:      { type: string, format: date }
 *               deliverables: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Milestone updated
 */
router.patch("/:id", updateMilestone);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones/{id}/submit:
 *   patch:
 *     tags: [Milestones]
 *     summary: Submit milestone for approval
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Milestone submitted
 */
router.patch("/:id/submit", submitMilestone);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones/{id}/approve:
 *   patch:
 *     tags: [Milestones]
 *     summary: Approve a submitted milestone — auto-generates invoice (manager / admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Milestone approved and invoice generated
 */
router.patch("/:id/approve", approveMilestone);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones/{id}/reject:
 *   patch:
 *     tags: [Milestones]
 *     summary: Reject a submitted milestone (manager / admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
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
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Milestone rejected
 */
router.patch("/:id/reject", rejectMilestone);

/**
 * @openapi
 * /api/v1/projects/{projectId}/milestones/{id}:
 *   delete:
 *     tags: [Milestones]
 *     summary: Delete a milestone (manager / admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Milestone deleted
 */
router.delete("/:id", deleteMilestone);

export default router;