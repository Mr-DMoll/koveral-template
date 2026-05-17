import { Router } from "express";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "./task.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

// Mounted at /api/v1/projects/:projectId/tasks
const router = Router({ mergeParams: true });

router.use(protect);

/**
 * @openapi
 * /api/v1/projects/{projectId}/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List all tasks for a project
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
 *           enum: [BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE]
 *       - in: query
 *         name: milestoneId
 *         schema:
 *           type: string
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get("/", listTasks);

/**
 * @openapi
 * /api/v1/projects/{projectId}/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a task (manager / admin only)
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
 *             required: [title]
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               status:      { type: string, enum: [BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE] }
 *               priority:    { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               assigneeId:  { type: string }
 *               milestoneId: { type: string }
 *               dueDate:     { type: string, format: date }
 *     responses:
 *       201:
 *         description: Task created
 */
router.post("/", createTask);

/**
 * @openapi
 * /api/v1/projects/{projectId}/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get a single task
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
 *         description: Task data
 */
router.get("/:id", getTask);

/**
 * @openapi
 * /api/v1/projects/{projectId}/tasks/{id}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update a task (manager full update, developer status only)
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
 *               title:       { type: string }
 *               description: { type: string }
 *               status:      { type: string, enum: [BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE] }
 *               priority:    { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               assigneeId:  { type: string }
 *               milestoneId: { type: string }
 *               dueDate:     { type: string, format: date }
 *     responses:
 *       200:
 *         description: Task updated
 */
router.patch("/:id", updateTask);

/**
 * @openapi
 * /api/v1/projects/{projectId}/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task (manager / admin only)
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
 *         description: Task deleted
 */
router.delete("/:id", deleteTask);

export default router;