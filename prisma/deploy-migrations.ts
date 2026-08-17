import "dotenv/config";
import { createClient } from "@libsql/client";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// `prisma migrate deploy` resolves its connection from prisma.config.ts's
// DATABASE_URL, which has no way to carry a Turso auth token — the app
// itself only ever connects via TURSO_DATABASE_URL/TURSO_AUTH_TOKEN through
// the libsql driver adapter (see lib/prisma.ts). This script is the same
// migration-apply step `migrate deploy` would do, run through that same
// adapter/connection instead, so schema changes actually reach the deployed
// Turso database on every build instead of silently staying local-only.
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

async function main() {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  // Same table Prisma Migrate itself uses to track applied migrations, so
  // this stays interoperable with `prisma migrate status`/`deploy` if a
  // direct DATABASE_URL to this database is ever available later.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    TEXT PRIMARY KEY NOT NULL,
        "checksum"              TEXT NOT NULL,
        "finished_at"           DATETIME,
        "migration_name"        TEXT NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        DATETIME,
        "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const appliedRows = await client.execute(
    `SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`
  );
  const appliedNames = new Set(appliedRows.rows.map((r) => String(r.migration_name)));

  // Migration folder names are timestamp-prefixed, so a plain string sort is
  // also the correct chronological application order.
  const migrationDirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let appliedCount = 0;
  for (const dir of migrationDirs) {
    if (appliedNames.has(dir)) continue;
    const sqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!existsSync(sqlPath)) continue;

    const sql = readFileSync(sqlPath, "utf-8");
    const checksum = createHash("sha256").update(sql).digest("hex");

    console.log(`Applying migration ${dir}...`);
    await client.executeMultiple(sql);
    await client.execute({
      sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, ?, ?, 1)`,
      args: [randomUUID(), checksum, Date.now(), dir, Date.now()],
    });
    appliedCount++;
  }

  console.log(appliedCount === 0 ? "No pending migrations." : `Applied ${appliedCount} migration(s).`);
}

main().catch((err) => {
  console.error("Migration deploy failed:", err);
  process.exit(1);
});
