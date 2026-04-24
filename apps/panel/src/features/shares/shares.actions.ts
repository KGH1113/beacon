"use server";

import { RevokeShareInputSchema } from "./shares.schema";

export type ShareActionResult = {
  ok: boolean;
  message: string;
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

  return {
    ok: false,
    message: "Not connected yet",
  };
}
