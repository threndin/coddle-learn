import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import type { ApiHealth } from "@coddle/shared";
import { APP_NAME } from "@coddle/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(helmet());
app.use(cors({ origin: webOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  const body: ApiHealth = {
    status: "ok",
    service: "coddle-learn-api",
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});

app.get("/", (_req, res) => {
  res.json({
    name: APP_NAME,
    message: "Coddle Learn API",
    docs: "/health",
  });
});

app.listen(port, () => {
  console.log(`${APP_NAME} API listening on http://localhost:${port}`);
});
