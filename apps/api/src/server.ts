import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import systemRoutes from "./modules/system/system.routes.js";

const app = express();

// 🚀 AGENCY BLUEPRINT: Strict CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "https://obit-nu.vercel.app",
  "https://obit-gdq0y021n-phoque-orbit.vercel.app"
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("CORS policy does not allow access from this origin."), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Mono2 API", version: "1.0.0" },
    servers: [
      { url: "http://localhost:3001", description: "Local Development" },
      { url: "https://rfpxfgdpbq.us-east-1.awsapprunner.com", description: "Production API" }
    ],
  },
  apis: ["./src/modules/system/*.routes.ts"],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/api/v1/system", systemRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API Running on Port: ${PORT}`);
  console.log(`📖 Swagger: http://localhost:${PORT}/api-docs`);
});