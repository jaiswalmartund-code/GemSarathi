import express from "express";
import cors from "cors";
import fs from "node:fs";
import { config } from "./config/index.js";
import { connectDatabase, dbMode } from "./db/models.js";
import { documentUnderstandingService } from "./services/ai/documentUnderstandingService.js";
import { storageMode } from "./services/documents/fileStorageService.js";
import router from "./routes/apiRoutes.js";

const app = express();

app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: config.appName, ai_enabled: true, ai_mode: documentUnderstandingService.getMode(), db_mode: dbMode, storage: storageMode() })
);

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
