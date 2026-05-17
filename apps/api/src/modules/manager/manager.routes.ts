import { Router } from "express";
import { managerDashboard, managerActivity } from "./manager.controller.js";
import { protect }   from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";
import { Role }      from "@repo/types";

const router = Router();

router.use(protect);
router.use(authorize([Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN]));

/**
 * @openapi
 * /api/v1/manager/dashboard:
 *   get:
 *     tags: [Manager]
 *     summary: Manager overview dashboard data
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats, projects, pending approvals
 */
router.get("/dashboard", managerDashboard);

/**
 * @openapi
 * /api/v1/manager/activity:
 *   get:
 *     tags: [Manager]
 *     summary: Manager activity log (paginated)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
router.get("/activity", managerActivity);

export default router;
