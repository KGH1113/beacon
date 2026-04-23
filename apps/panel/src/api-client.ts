import type { z } from "zod";

import { ApiError } from "./api-error";

export async function fetchJson<TSchema extends z.ZodTypeAny>(
  input: RequestInfo | URL,
  init: RequestInit,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new ApiError("Request failed.", response.status);
  }

  const payload = await response.json();
  return schema.parse(payload);
}
