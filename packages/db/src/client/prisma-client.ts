import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  ensureDatabaseUrl();
  prismaClient ??= new PrismaClient();
  return prismaClient;
}

function ensureDatabaseUrl() {
  process.env.DATABASE_URL ??= `file:${join(
    findWorkspaceRoot(),
    "data",
    "beacon.db",
  )}`;

  if (!process.env.DATABASE_URL.startsWith("file:")) {
    return;
  }

  const databasePath = process.env.DATABASE_URL.replace(/^file:/, "");

  if (!databasePath || databasePath === ":memory:") {
    return;
  }

  mkdirSync(dirname(databasePath), { recursive: true });
}

function findWorkspaceRoot() {
  let current = process.cwd();

  for (let depth = 0; depth < 5; depth += 1) {
    if (existsSync(join(current, "turbo.json"))) {
      return current;
    }

    const parent = dirname(current);

    if (parent === current) {
      return process.cwd();
    }

    current = parent;
  }

  return process.cwd();
}
