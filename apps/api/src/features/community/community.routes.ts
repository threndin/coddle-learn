import express, { Router } from "express";
import multer from "multer";
import { COMMUNITY_IMAGE_TYPES, COMMUNITY_LIMITS } from "@coddle/shared";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth, requireCsrf } from "../auth/auth.middleware.js";
import {
  createCommunityHandler,
  deleteCommunityHandler,
  impressionHandler,
  listCommunityHandler,
  reactionHandler,
  relatedOptionsHandler,
  spotlightHandler,
  uploadImageHandler,
} from "./community.controller.js";

export const communityRouter: Router = Router();

const rawImage = express.raw({
  type: [...COMMUNITY_IMAGE_TYPES],
  limit: COMMUNITY_LIMITS.imageBytesMax + 1024,
});

const postImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: COMMUNITY_LIMITS.imagesMax,
    fileSize: COMMUNITY_LIMITS.imageBytesMax,
  },
  fileFilter(_req, file, cb) {
    if ((COMMUNITY_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("unsupported_image"));
  },
}).array("images", COMMUNITY_LIMITS.imagesMax);

communityRouter.get("/", requireAuth, asyncHandler(listCommunityHandler));
communityRouter.get("/related", requireAuth, asyncHandler(relatedOptionsHandler));
communityRouter.get("/spotlight", requireAuth, asyncHandler(spotlightHandler));
communityRouter.post(
  "/",
  requireAuth,
  requireCsrf,
  (req, res, next) => {
    postImages(req, res, (err) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
          res.status(400).json({
            error: {
              code: "invalid_field",
              message: `You can attach up to ${COMMUNITY_LIMITS.imagesMax} images.`,
              details: { field: "images" },
            },
          });
          return;
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: {
              code: "image_too_large",
              message: `Images must be ${Math.round(COMMUNITY_LIMITS.imageBytesMax / (1024 * 1024))} MB or smaller.`,
            },
          });
          return;
        }
      }
      if (err instanceof Error && err.message === "unsupported_image") {
        res.status(415).json({
          error: {
            code: "unsupported_image",
            message: "Upload a PNG, JPEG, WebP, or GIF image.",
          },
        });
        return;
      }
      next(err);
    });
  },
  asyncHandler(createCommunityHandler),
);
communityRouter.post(
  "/images",
  requireAuth,
  requireCsrf,
  rawImage,
  asyncHandler(uploadImageHandler),
);
communityRouter.post(
  "/:id/impressions",
  requireAuth,
  requireCsrf,
  asyncHandler(impressionHandler),
);
communityRouter.put("/:id/reactions", requireAuth, requireCsrf, asyncHandler(reactionHandler));
communityRouter.delete(
  "/:id",
  requireAuth,
  requireCsrf,
  asyncHandler(deleteCommunityHandler),
);
