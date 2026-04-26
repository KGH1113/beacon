import { Elysia } from "elysia";

import { dockerRoute } from "./modules/docker/docker.route";
import { healthRoute } from "./modules/health/health.route";
import { minecraftRoute } from "./modules/minecraft/minecraft.route";
import { sharePublicRoute, shareRoute } from "./modules/share/share.route";
import { systemRoute } from "./modules/system/system.route";
import { authPlugin } from "./plugins/auth.plugin";
import { corsPlugin } from "./plugins/cors.plugin";
import { swaggerPlugin } from "./plugins/swagger.plugin";

export const app = new Elysia()
  .use(corsPlugin)
  .use(healthRoute)
  .use(sharePublicRoute)
  .group("/api/v1", (api) =>
    api
      .use(swaggerPlugin)
      .use(authPlugin)
      .use(dockerRoute)
      .use(minecraftRoute)
      .use(systemRoute)
      .use(shareRoute),
  );
