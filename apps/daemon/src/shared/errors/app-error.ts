import type { ErrorCode } from "./error-code";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}
