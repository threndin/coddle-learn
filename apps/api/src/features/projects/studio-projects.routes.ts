import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  studioArchiveHandler,
  studioCreateHandler,
  studioDeleteHandler,
  studioGetHandler,
  studioListHandler,
  studioOptionsHandler,
  studioRestoreHandler,
  studioSubmitHandler,
  studioUpdateHandler,
  studioWithdrawHandler,
} from "./projects.controller.js";

export const studioProjectsRouter: Router = Router();

const write = [requireAuth, requireCsrf] as const;

studioProjectsRouter.get("/", requireAuth, asyncHandler(studioListHandler));
studioProjectsRouter.get("/options", requireAuth, asyncHandler(studioOptionsHandler));
studioProjectsRouter.post("/", ...write, asyncHandler(studioCreateHandler));
studioProjectsRouter.get("/:projectId", requireAuth, asyncHandler(studioGetHandler));
studioProjectsRouter.patch("/:projectId", ...write, asyncHandler(studioUpdateHandler));
studioProjectsRouter.delete("/:projectId", ...write, asyncHandler(studioDeleteHandler));
studioProjectsRouter.post(
  "/:projectId/submit",
  ...write,
  asyncHandler(studioSubmitHandler),
);
studioProjectsRouter.post(
  "/:projectId/withdraw",
  ...write,
  asyncHandler(studioWithdrawHandler),
);
studioProjectsRouter.post(
  "/:projectId/archive",
  ...write,
  asyncHandler(studioArchiveHandler),
);
studioProjectsRouter.post(
  "/:projectId/restore",
  ...write,
  asyncHandler(studioRestoreHandler),
);
