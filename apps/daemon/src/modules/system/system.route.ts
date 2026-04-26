import { Elysia } from "elysia";

import { SystemController } from "./system.controller";

const systemController = new SystemController();

export const systemRoute = new Elysia({
  name: "system.route",
  prefix: "/system",
}).get("/overview", () => systemController.getOverview());
