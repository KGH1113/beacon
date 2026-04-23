import { Elysia } from "elysia";

import { ShareController } from "./share.controller";

const shareController = new ShareController();

export const shareRoute = new Elysia({
  name: "share.route",
  prefix: "/share",
}).decorate("shareController", shareController);
