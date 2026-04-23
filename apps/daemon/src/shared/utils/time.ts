export function now(): Date {
  return new Date();
}

export function nowIso(): string {
  return now().toISOString();
}
