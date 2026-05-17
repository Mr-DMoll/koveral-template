import { Router } from "express";
import { Role } from "@repo/types";
import {
  submitIntake,
  listIntakes,
  getIntake,
  convertIntake,
} from "./intake.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/v1/intake:
 *   post:
 *     tags: [Intake]
 *     summary: Submit a new intake form (public)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientName, clientEmail, projectName, projectType, description]
 *             properties:
 *               clientName:        { type: string }
 *               clientEmail:       { type: string, format: email }
 *               clientPhone:       { type: string }
 *               companyName:       { type: string }
 *               projectName:       { type: string }
 *               projectType:       { type: string }
 *               description:       { type: string }
 *               budgetRange:       { type: string }
 *               preferredTimeline: { type: string }
 *               referenceLinks:    { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Intake submitted
 */
router.post("/", submitIntake);

/**
 * @openapi
 * /api/v1/intake:
 *   get:
 *     tags: [Intake]
 *     summary: List all intake forms (ADMIN / MANAGER only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: converted
 *         schema:
 *           type: boolean
 *         description: Filter by conversion status
 *     responses:
 *       200:
 *         description: List of intake forms
 */
router.get(
  "/",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  listIntakes,
);

/**
 * @openapi
 * /api/v1/intake/{id}:
 *   get:
 *     tags: [Intake]
 *     summary: Get a single intake form (ADMIN / MANAGER only)
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
 *         description: Intake form data
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  getIntake,
);

/**
 * @openapi
 * /api/v1/intake/{id}/convert:
 *   post:
 *     tags: [Intake]
 *     summary: Convert intake form to a project (ADMIN / MANAGER only)
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
 *             required: [clientId]
 *             properties:
 *               clientId:   { type: string }
 *               managerId:  { type: string }
 *               budget:     { type: number }
 *               currency:   { type: string }
 *               deadline:   { type: string, format: date }
 *     responses:
 *       201:
 *         description: Project created from intake
 *       409:
 *         description: Already converted
 */
router.post(
  "/:id/convert",
  protect,
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  convertIntake,
);

export default router;