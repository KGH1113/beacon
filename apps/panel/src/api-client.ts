import type { z } from "zod";

import { ApiError } from "./api-error";

const defaultDaemonTimeoutMs = 2500;

export async function fetchJson<TSchema extends z.ZodTypeAny>(
  input: RequestInfo | URL,
  schema: TSchema,
  init: RequestInit = {},
): Promise<z.infer<TSchema>> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new ApiError("Request failed.", response.status);
  }

  const payload = await response.json();
  return schema.parse(payload);
}

export async function fetchDaemonJson<TSchema extends z.ZodTypeAny>(
  baseUrl: string,
  path: `/${string}`,
  schema: TSchema,
  init: RequestInit = {},
): Promise<z.infer<TSchema>> {
  const url = new URL(path, baseUrl);

  return fetchJson(url, schema, {
    ...init,
    cache: init.cache ?? "no-store",
    signal: init.signal ?? AbortSignal.timeout(defaultDaemonTimeoutMs),
  });
}
