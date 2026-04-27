"use server";

import { fetchDaemonJson } from "@/api-client";
import { getPanelEnv } from "@/env";

import {
  ControlDockerContainerInputSchema,
  ControlDockerContainerOutputSchema,
} from "./docker.schema";

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

  try {
    const env = getPanelEnv();

    await fetchDaemonJson(
      env.BEACON_DAEMON_URL,
      `/api/v1/docker/containers/${encodeURIComponent(parsed.data.containerId)}/${parsed.data.action}` as `/${string}`,
      ControlDockerContainerOutputSchema,
      {
        method: "POST",
      },
    );

    return {
      ok: true,
      message: "Container control requested",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to control container",
    };
  }
}
