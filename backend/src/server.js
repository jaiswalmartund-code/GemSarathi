import express from "express";
import cors from "cors";
import fs from "node:fs";
import { config } from "./config/index.js";
import { connectDatabase, dbMode } from "./db/models.js";
import { documentUnderstandingService } from "./services/ai/documentUnderstandingService.js";
import { storageMode } from "./services/documents/fileStorageService.js";
import router from "./routes/apiRoutes.js";

const app = express();

// Parse and normalize allowed frontend origins for CORS
const configuredOrigins = (config.frontendOrigin || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, health probes)
    if (!origin) return callback(null, true);

    const normOrigin = origin.replace(/\/+$/, "");

    // 1. Match explicitly configured origins (e.g. https://gem-sarathi.vercel.app)
    if (configuredOrigins.includes(normOrigin)) {
      return callback(null, true);
    }

    // 2. Allow local development origins (localhost / 127.0.0.1 on any port)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normOrigin)) {
      return callback(null, true);
    }

    // 3. Allow Vercel preview deployment domains
    if (/^https:\/\/[a-zA-Z0-9-]+(-[a-zA-Z0-9-]+)*\.vercel\.app$/.test(normOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy error: Origin '${origin}' is not allowed.`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health Check Endpoints (both /health and /api/health)
const healthHandler = (_req, res) =>
  res.json({
    status: "ok",
    service: config.appName,
    ai_enabled: true,
    ai_mode: documentUnderstandingService.getMode(),
    db_mode: dbMode,
    storage: storageMode(),
  });

app.get("/health", healthHandler);
app.get(`${config.apiPrefix}/health`, healthHandler);

app.use(config.apiPrefix, router);

app.use((error, _req, res, _next) =>
  res.status(error.status || 500).json({ detail: error.message || "Internal server error" })
);

try {
  fs.mkdirSync(config.uploadDir, { recursive: true });
} catch {
  // uploads dir creation is best-effort
}

connectDatabase()
  .then(() =>
    app.listen(config.port, () =>
      console.log(`${config.appName} listening on port ${config.port}`)
    )
  )
  .catch((error) => {
    console.error("Database startup failed", error);
    process.exit(1);
  });
