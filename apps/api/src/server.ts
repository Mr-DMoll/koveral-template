import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import systemRoutes from "./modules/system/system.routes.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Mono2 API", version: "1.0.0" },
    servers: [{ url: "http://localhost:3001" }],
  },
  apis: ["./src/modules/system/*.routes.ts"],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/api/v1/system", systemRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Health: http://localhost:${PORT}/api/v1/system/health`);
  console.log(`📖 Swagger: http://localhost:${PORT}/api-docs`);
});