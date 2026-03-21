import express,{Express} from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// Internal Imports
import { swaggerConfig } from "./config/swagger.config.js";
import systemRoutes from "./modules/system/system.routes.js";

const app:Express = express();
const isProduction = process.env.NODE_ENV === "production";

// 1. SECURITY & LOGGING
app.use(helmet());
app.use(morgan(isProduction ? "combined" : "dev"));

// 2. ADVANCED CORS (Agency Standard)
const allowedOrigins = [
  "http://localhost:3000",
  "https://obit-nu.vercel.app",
  "https://obit-gdq0y021n-phoque-orbit.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server or Postman)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));

      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`🔴 CORS Blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 3. PARSERS
app.use(express.json());

// 4. DOCUMENTATION (Swagger)
const specs = swaggerJsdoc(swaggerConfig);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// 5. ROUTES
const API_PREFIX = "/api/v1";

// System Health & Info
app.use(`${API_PREFIX}/system`, systemRoutes);

// 🚀 SOP: Add new module routes here
// app.use(`${API_PREFIX}/users`, userRoutes);

// 6. PORT & INITIALIZATION
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n-----------------------------------------`);
  console.log(`🚀 O-BIT API: RUNNING`);
  console.log(`🌍 MODE: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 HEALTH: http://localhost:${PORT}${API_PREFIX}/system/health`);
  console.log(`📖 SWAGGER: http://localhost:${PORT}/api-docs`);
  console.log(`-----------------------------------------\n`);
});

export default app;