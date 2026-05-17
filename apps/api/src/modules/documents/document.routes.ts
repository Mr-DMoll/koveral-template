import { Router } from "express";
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "./document.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

// Mounted at /api/v1/projects/:projectId/documents
const router = Router({ mergeParams: true });

router.use(protect);

/**
 * @openapi
 * /api/v1/projects/{projectId}/documents:
 *   get:
 *     tags: [Documents]
 *     summary: List all documents for a project
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SCOPE, CONTRACT, SPECIFICATION, DESIGN_BRIEF, HANDOVER, OTHER]
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get("/", listDocuments);

/**
 * @openapi
 * /api/v1/projects/{projectId}/documents:
 *   post:
 *     tags: [Documents]
 *     summary: Create a document
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
 *             required: [type, title]
 *             properties:
 *               type:     { type: string, enum: [SCOPE, CONTRACT, SPECIFICATION, DESIGN_BRIEF, HANDOVER, OTHER] }
 *               title:    { type: string }
 *               content:  { type: string }
 *               fileUrl:  { type: string }
 *               fileSize: { type: number }
 *               mimeType: { type: string }
 *     responses:
 *       201:
 *         description: Document created
 */
router.post("/", createDocument);

/**
 * @openapi
 * /api/v1/projects/{projectId}/documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get a single document
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
 *         description: Document data
 */
router.get("/:id", getDocument);

/**
 * @openapi
 * /api/v1/projects/{projectId}/documents/{id}:
 *   patch:
 *     tags: [Documents]
 *     summary: Update a document
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
 *               title:   { type: string }
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: Document updated
 */
router.patch("/:id", updateDocument);

/**
 * @openapi
 * /api/v1/projects/{projectId}/documents/{id}:
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a document (manager / admin only)
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
 *         description: Document deleted
 */
router.delete("/:id", deleteDocument);

export default router;