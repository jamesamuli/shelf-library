import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// SERVER ONLY. Never import this from a Client Component — it would ship the
// database credentials to the browser. Use it from Server Components, Server
// Actions, route handlers, and scripts.

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      /**
       * Prisma Postgres drops idle connections server-side. Left at the pg
       * default (30s), the pool happily hands out a socket the server has
       * already closed and the next query dies with P1017 "Server has closed
       * the connection" — intermittently, after any quiet period, in
       * production as much as in dev. Retiring our own idle clients first
       * means the pool only ever holds connections it opened recently.
       */
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      max: 5,
    }),
  });

// Next.js dev hot-reloads modules on every edit; without caching on globalThis
// each reload would open a new pool and exhaust the database's connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
