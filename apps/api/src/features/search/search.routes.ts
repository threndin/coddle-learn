import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { searchHandler } from "./search.controller.js";

export const searchRouter: Router = Router();

searchRouter.get("/", requireAuth, asyncHandler(searchHandler));
