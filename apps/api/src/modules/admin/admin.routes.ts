import { Router } from "express";
import { adminDashboard, adminActivity, adminClients, adminInvoices } from "./admin.controller.js";
import { protect }   from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";
import { Role }      from "@repo/types";

const router = Router();
router.use(protect);
router.use(authorize([Role.ADMIN, Role.SUPER_ADMIN]));

/**
 * @openapi
 * /api/v1/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Agency-wide dashboard stats
 *     security:
 *       - cookieAuth: []
 */
router.get("/dashboard", adminDashboard);

/**
 * @openapi
 * /api/v1/admin/activity:
 *   get:
 *     tags: [Admin]
 *     summary: Full audit log (paginated, filterable)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 */
router.get("/activity", adminActivity);

/**
 * @openapi
 * /api/v1/admin/clients:
 *   get:
 *     tags: [Admin]
 *     summary: All clients with their projects
 *     security:
 *       - cookieAuth: []
 */
router.get("/clients", adminClients);

/**
 * @openapi
 * /api/v1/admin/invoices:
 *   get:
 *     tags: [Admin]
 *     summary: All invoices across all projects (paginated)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, PAID, OVERDUE, CANCELLED]
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 */
router.get("/invoices", adminInvoices);

export default router;
