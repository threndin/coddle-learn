import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { getSitemapHandler } from "./sitemap.controller.js";

export const sitemapRouter: Router = Router();

sitemapRouter.get("/", asyncHandler(getSitemapHandler));
