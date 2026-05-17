import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { swaggerConfig } from "./config/swagger.config.js";
import { globalErrorHandler } from "./middleware/error.middleware.js";
import systemRoutes from "./modules/system/system.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import projectRoutes from "./modules/projects/project.routes.js";
import intakeRoutes  from "./modules/intake/intake.routes.js";
import milestoneRoutes from "./modules/milestones/milestone.routes.js";
import taskRoutes from "./modules/tasks/task.routes.js";
import documentRoutes from "./modules/documents/document.routes.js";
import invoiceRoutes  from "./modules/invoices/invoice.routes.js";
import commentRoutes from "./modules/comments/comment.routes.js";
import managerRoutes from "./modules/manager/manager.routes.js";
import clientRoutes from "./modules/client/client.routes.js";
import developerRoutes from "./modules/developer/developer.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import workerRoutes from "./modules/workers/workers.routes.js";
import changeRequestRoutes from "./modules/change-requests/change-request.routes.js";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

// ── 1. SECURITY & LOGGING ─────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(isProduction ? "combined" : "dev"));

// ── 2. CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "https://obit-nu.vercel.app",
  "https://obit-gdq0y021n-phoque-orbit.vercel.app",
  "https://phoque-orbit.co.za",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some((allowed) =>
        origin.startsWith(allowed),
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`🔴 CORS Blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods:     ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── 3. PARSERS ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // ← required for req.cookies to work

// ── 4. SWAGGER DOCS ───────────────────────────────────────────────────────────
const specs = swaggerJsdoc(swaggerConfig);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// ── 5. ROUTES ─────────────────────────────────────────────────────────────────
const API_PREFIX = "/api/v1";

app.use(`${API_PREFIX}/system`, systemRoutes);
app.use(`${API_PREFIX}/auth`,   authRoutes);
app.use(`${API_PREFIX}/users`,  userRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/intake`,   intakeRoutes);
app.use(`${API_PREFIX}/projects/:projectId/milestones`, milestoneRoutes);
app.use(`${API_PREFIX}/projects/:projectId/tasks`, taskRoutes);
app.use(`${API_PREFIX}/projects/:projectId/documents`, documentRoutes);
app.use(`${API_PREFIX}/projects/:projectId/invoices`,  invoiceRoutes);
app.use(`${API_PREFIX}/projects/:projectId/comments`, commentRoutes);
app.use(`${API_PREFIX}/manager`, managerRoutes);
app.use(`${API_PREFIX}/client`, clientRoutes);
app.use(`${API_PREFIX}/developer`, developerRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/projects/:projectId/workers`, workerRoutes);
app.use(`${API_PREFIX}/projects/:projectId/change-requests`, changeRequestRoutes);

// ── 6. 404 HANDLER ────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status:  "fail",
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── 7. GLOBAL ERROR HANDLER (must be last) ────────────────────────────────────
app.use(globalErrorHandler);

// ── 8. START ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n─────────────────────────────────────────`);
  console.log(`🚀  O-BIT API: RUNNING`);
  console.log(`🌍  MODE:    ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗  HEALTH:  http://localhost:${PORT}${API_PREFIX}/system/health`);
  console.log(`📖  SWAGGER: http://localhost:${PORT}/api-docs`);
  console.log(`─────────────────────────────────────────\n`);
});

export default app;