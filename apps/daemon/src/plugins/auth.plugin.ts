import { Elysia } from "elysia";

export const authPlugin = new Elysia({ name: "auth.plugin" }).decorate("auth", {
  enabled: true,
});
