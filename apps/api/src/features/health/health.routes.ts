import { Router } from "express";
import { getHealth, getRoot } from "./health.controller.js";

export const healthRouter: Router = Router();

healthRouter.get("/health", getHealth);
healthRouter.get("/", getRoot);
