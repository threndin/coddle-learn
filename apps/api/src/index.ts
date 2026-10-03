import "dotenv/config";
import { APP_NAME } from "@coddle/shared";
import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`${APP_NAME} API listening on http://localhost:${config.port}`);
});
