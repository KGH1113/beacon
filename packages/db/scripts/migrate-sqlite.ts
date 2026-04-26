import { Database } from "bun:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith("file:")) {
  throw new Error("SQLite fallback migration requires a file: DATABASE_URL.");
}

const databasePath = resolveDatabasePath(databaseUrl);
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
const migrationsPath = resolve(process.cwd(), "prisma/migrations");

db.exec(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  );
`);

for (const migrationName of getMigrationNames(migrationsPath)) {
  if (isMigrationApplied(migrationName)) {
    continue;
  }

  const sql = readFileSync(
    join(migrationsPath, migrationName, "migration.sql"),
    "utf-8",
  );
  const now = new Date().toISOString();

  db.exec("BEGIN");

  try {
    db.exec(sql);
    db.query(
      `
        INSERT INTO "_prisma_migrations" (
          "id",
          "checksum",
          "finished_at",
          "migration_name",
          "started_at",
          "applied_steps_count"
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(randomUUID(), checksum(sql), now, migrationName, now, 1);
    db.exec("COMMIT");
    console.log(`Applied SQLite migration fallback: ${migrationName}`);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

db.close();

function resolveDatabasePath(url: string) {
  const path = url.replace(/^file:/, "");

  if (path === ":memory:") {
    return path;
  }

  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

function getMigrationNames(path: string) {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function isMigrationApplied(migrationName: string) {
  const row = db
    .query(
      `
        SELECT "id"
        FROM "_prisma_migrations"
        WHERE "migration_name" = ?
          AND "rolled_back_at" IS NULL
        LIMIT 1
      `,
    )
    .get(migrationName);

  return Boolean(row);
}

function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
