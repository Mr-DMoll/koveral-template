import { Router } from "express";
import { developerDashboard, developerTasks } from "./developer.controller.js";
import { protect }   from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";
import { Role }      from "@repo/types";

const router = Router();
router.use(protect);
router.use(authorize([Role.DEVELOPER, Role.ADMIN, Role.SUPER_ADMIN]));

/**
 * @openapi
 * /api/v1/developer/dashboard:
 *   get:
 *     tags: [Developer]
 *     summary: Developer overview — projects, tasks, stats
 *     security:
 *       - cookieAuth: []
 */
router.get("/dashboard", developerDashboard);

/**
 * @openapi
 * /api/v1/developer/tasks:
 *   get:
 *     tags: [Developer]
 *     summary: All tasks assigned to this developer (cross-project)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE]
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 */
router.get("/tasks", developerTasks);

export default router;
