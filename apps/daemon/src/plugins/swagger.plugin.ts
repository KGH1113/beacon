import { Elysia } from "elysia";

export const swaggerPlugin = new Elysia({ name: "swagger.plugin" }).decorate(
  "swagger",
  {
    enabledInDevelopment: true,
  },
);
