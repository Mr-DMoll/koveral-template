import { Router } from "express";
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
} from "./invoice.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

// Mounted at /api/v1/projects/:projectId/invoices
const router = Router({ mergeParams: true });

router.use(protect);

/**
 * @openapi
 * /api/v1/projects/{projectId}/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: List all invoices for a project
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, PAID, OVERDUE, CANCELLED]
 *     responses:
 *       200:
 *         description: List of invoices
 */
router.get("/", listInvoices);

/**
 * @openapi
 * /api/v1/projects/{projectId}/invoices:
 *   post:
 *     tags: [Invoices]
 *     summary: Create a manual invoice (manager / admin only)
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
 *             required: [amount]
 *             properties:
 *               amount:      { type: number }
 *               description: { type: string }
 *               dueDate:     { type: string, format: date }
 *               isDeposit:   { type: boolean }
 *               milestoneId: { type: string }
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.post("/", createInvoice);

/**
 * @openapi
 * /api/v1/projects/{projectId}/invoices/{id}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get a single invoice
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
 *         description: Invoice data
 */
router.get("/:id", getInvoice);

/**
 * @openapi
 * /api/v1/projects/{projectId}/invoices/{id}/status:
 *   patch:
 *     tags: [Invoices]
 *     summary: Update invoice status
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, PAID, OVERDUE, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/:id/status", updateInvoiceStatus);

export default router;