import { Router } from "express";
import {
  listChangeRequests,
  createChangeRequest,
  updateChangeRequestStatus,
  deleteChangeRequest,
} from "./change-request.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });
router.use(protect);

/**
 * @openapi
 * /api/v1/projects/{projectId}/change-requests:
 *   get:
 *     tags: [Change Requests]
 *     summary: List change requests for a project
 *     security:
 *       - cookieAuth: []
 */
router.get("/", listChangeRequests);

/**
 * @openapi
 * /api/v1/projects/{projectId}/change-requests:
 *   post:
 *     tags: [Change Requests]
 *     summary: Create a change request
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, description]
 *             properties:
 *               type:        { type: string }
 *               description: { type: string }
 *               price:       { type: number }
 */
router.post("/", createChangeRequest);

/**
 * @openapi
 * /api/v1/projects/{projectId}/change-requests/{id}/status:
 *   patch:
 *     tags: [Change Requests]
 *     summary: Update change request status
 *     security:
 *       - cookieAuth: []
 */
router.patch("/:id/status", updateChangeRequestStatus);

/**
 * @openapi
 * /api/v1/projects/{projectId}/change-requests/{id}:
 *   delete:
 *     tags: [Change Requests]
 *     summary: Delete a change request
 *     security:
 *       - cookieAuth: []
 */
router.delete("/:id", deleteChangeRequest);

export default router;