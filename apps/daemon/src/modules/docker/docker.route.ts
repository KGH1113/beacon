import { Elysia } from "elysia";

import { DockerController } from "./docker.controller";

const dockerController = new DockerController();

export const dockerRoute = new Elysia({
  name: "docker.route",
  prefix: "/docker",
}).decorate("dockerController", dockerController);
