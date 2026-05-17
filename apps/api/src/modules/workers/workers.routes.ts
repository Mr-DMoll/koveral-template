import { Router } from "express";
import { triggerScopeWorker, triggerContractWorker, triggerTaskGenerator, triggerHandoverWorker, workerStatus, triggerChangeRequestWorker} from "./workers.controller.js";


import { protect }   from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";
import { Role }      from "@repo/types";

// Mounted at /api/v1/projects/:projectId/workers
const router = Router({ mergeParams: true });

router.use(protect);
router.use(authorize([Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN]));

/**
 * @openapi
 * /api/v1/projects/{projectId}/workers/status:
 *   get:
 *     tags: [Workers]
 *     summary: Get available workers for this project
 *     security:
 *       - cookieAuth: []
 */
router.get("/status", workerStatus);

/**
 * @openapi
 * /api/v1/projects/{projectId}/workers/scope:
 *   post:
 *     tags: [Workers]
 *     summary: Generate scope document using AI
 *     security:
 *       - cookieAuth: []
 */
router.post("/scope", triggerScopeWorker);

/**
 * @openapi
 * /api/v1/projects/{projectId}/workers/contract:
 *   post:
 *     tags: [Workers]
 *     summary: Generate contract using AI from approved scope
 *     security:
 *       - cookieAuth: []
 */
router.post("/contract", triggerContractWorker);

/**
 * @openapi
 * /api/v1/projects/{projectId}/workers/tasks:
 *   post:
 *     tags: [Workers]
 *     summary: Generate project tasks from approved scope using AI
 *     security:
 *       - cookieAuth: []
 */
router.post("/tasks", triggerTaskGenerator);

/**
 * @openapi
 * /api/v1/projects/{projectId}/workers/handover:
 *   post:
 *     tags: [Workers]
 *     summary: Generate handover document using AI from completed project
 *     security:
 *       - cookieAuth: []
 */
router.post("/handover", triggerHandoverWorker);

/**
 * @openapi
 * /api/v1/projects/{projectId}/workers/change-request:
 *   post:
 *     tags: [Workers]
 *     summary: Generate change request document from change request
 *     security:
 *       - cookieAuth: []
 */
router.post("/change-request", triggerChangeRequestWorker);




export default router;
