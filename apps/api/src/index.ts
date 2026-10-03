import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { APP_NAME } from "@coddle/shared";
import { config } from "./config.js";
import { errorHandler } from "./middleware/auth.js";
import { authRouter, healthRouter } from "./routes/auth.js";
import { onboardingRouter } from "./routes/onboarding.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: config.webOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(morgan(config.isProd ? "combined" : "dev"));

app.use(healthRouter);
app.use("/auth", authRouter);
app.use("/onboarding", onboardingRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`${APP_NAME} API listening on http://localhost:${config.port}`);
});
