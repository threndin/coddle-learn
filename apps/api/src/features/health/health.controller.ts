import type { Request, Response } from "express";
import type { ApiHealth } from "@coddle/shared";
import { APP_NAME } from "@coddle/shared";

export function getHealth(_req: Request, res: Response) {
  const body: ApiHealth = {
    status: "ok",
    service: "coddle-learn-api",
    timestamp: new Date().toISOString(),
  };
  res.json(body);
}

export function getRoot(_req: Request, res: Response) {
  res.json({
    name: APP_NAME,
    message: "Coddle Learn API",
    docs: "/health",
  });
}
