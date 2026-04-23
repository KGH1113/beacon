import { Elysia } from "elysia";

import { HealthController } from "./health.controller";

const healthController = new HealthController();

export const healthRoute = new Elysia({ name: "health.route" }).get(
  "/health",
  () => healthController.getStatus(),
);
