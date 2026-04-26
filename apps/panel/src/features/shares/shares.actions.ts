"use server";

import type { ShareDto } from "@beacon/shared";

import { fetchDaemonJson } from "@/api-client";
import { getPanelEnv } from "@/env";

import { RevokeShareInputSchema, ShareDtoSchema } from "./shares.schema";

export type ShareActionResult = {
  ok: boolean;
  message: string;
  share?: ShareDto;
};

export async function revokeShareAction(
  input: unknown,
): Promise<ShareActionResult> {
  const parsed = RevokeShareInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid share revoke request",
    };
  }

  try {
    const env = getPanelEnv();
    const share = await fetchDaemonJson(
      env.BEACON_DAEMON_URL,
      `/api/v1/share/${encodeURIComponent(parsed.data.shareId)}`,
      ShareDtoSchema,
      {
        method: "DELETE",
      },
    );

    return {
      ok: true,
      message: "Share revoked",
      share,
    };
  } catch {
    return {
      ok: false,
      message: "Failed to revoke share",
    };
  }
}
