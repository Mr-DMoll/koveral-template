import { Router } from "express";
import {
  listComments,
  createComment,
  deleteComment,
} from "./comment.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

// Mounted at /api/v1/projects/:projectId/comments
const router = Router({ mergeParams: true });

router.use(protect);

/**
 * @openapi
 * /api/v1/projects/{projectId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: List project comments (clients see public only)
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
 *         description: List of comments
 */
router.get("/", listComments);

/**
 * @openapi
 * /api/v1/projects/{projectId}/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Post a comment
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
 *             required: [content]
 *             properties:
 *               content:    { type: string }
 *               isInternal: { type: boolean }
 *     responses:
 *       201:
 *         description: Comment posted
 */
router.post("/", createComment);

/**
 * @openapi
 * /api/v1/projects/{projectId}/comments/{id}:
 *   delete:
 *     tags: [Comments]
 *     summary: Delete a comment (own comments or manager/admin)
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
 *         description: Comment deleted
 */
router.delete("/:id", deleteComment);

export default router;
