import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the connection URL out of schema.prisma into this file.
// DATABASE_URL is written to .env by `prisma postgres link` and is git-ignored.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
