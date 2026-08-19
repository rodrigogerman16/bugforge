// Config for the Supabase/PostgreSQL target schema (item 49) — kept
// separate from the root prisma.config.ts, which governs the live app's
// actual SQLite/Turso datasource and must not be touched by this.
//
// Usage once a real Supabase Postgres project exists:
//   npx prisma generate --config prisma/postgres/prisma.config.ts
//   npx prisma migrate dev --config prisma/postgres/prisma.config.ts --name init
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url: process.env["SUPABASE_POSTGRES_URL"],
  },
});
