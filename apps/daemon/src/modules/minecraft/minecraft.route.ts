import { Elysia } from "elysia";

import { MinecraftController } from "./minecraft.controller";

const minecraftController = new MinecraftController();

export const minecraftRoute = new Elysia({
  name: "minecraft.route",
  prefix: "/minecraft",
}).decorate("minecraftController", minecraftController);
