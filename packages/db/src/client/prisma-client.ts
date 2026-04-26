import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  ensureDatabaseUrl();
  prismaClient ??= new PrismaClient();
  return prismaClient;
}

function ensureDatabaseUrl() {
  process.env.DATABASE_URL ??= `file:${join(process.cwd(), "data", "beacon.db")}`;

  if (!process.env.DATABASE_URL.startsWith("file:")) {
    return;
  }

  const databasePath = process.env.DATABASE_URL.replace(/^file:/, "");

  if (!databasePath || databasePath === ":memory:") {
    return;
  }

  mkdirSync(dirname(databasePath), { recursive: true });
}
