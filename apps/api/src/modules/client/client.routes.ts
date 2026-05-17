import { Router } from "express";
import { clientDashboard } from "./client.controller.js";
import { protect }   from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";
import { Role }      from "@repo/types";

const router = Router();
router.use(protect);
router.use(authorize([Role.CLIENT]));

/**
 * @openapi
 * /api/v1/client/dashboard:
 *   get:
 *     tags: [Client]
 *     summary: Client dashboard — project overview, milestones, invoices
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get("/dashboard", clientDashboard);

export default router;
