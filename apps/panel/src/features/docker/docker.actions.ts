"use server";

import { ControlDockerContainerInputSchema } from "./docker.schema";

export type DockerActionResult = {
  ok: boolean;
  message: string;
};

export async function controlDockerContainerAction(
  input: unknown,
): Promise<DockerActionResult> {
  const parsed = ControlDockerContainerInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid container control request",
    };
  }

  return {
    ok: false,
    message: "Not connected yet",
  };
}
