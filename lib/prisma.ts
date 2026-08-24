import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// SERVER ONLY. Never import this from a Client Component — it would ship the
// database credentials to the browser. Use it from Server Components, Server
// Actions, route handlers, and scripts.

/**
 * Errors that mean "this socket died", not "this query was wrong". Retiring
 * idle clients reduces how often the pool hands out a connection the server
 * has already closed, but it cannot rule it out: the close can land between
 * the checkout and the query.
 */
const CONNECTION_LOST =
  /Server has closed the connection|Connection terminated|ECONNRESET|EPIPE/i;

/**
 * Reads only. A write that fails this way may still have committed — the
 * connection dropped before we heard the answer, not necessarily before the
 * server applied it — and replaying it could double-insert. Writes surface
 * the error instead.
 */
const READ_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "$queryRaw",
  "$queryRawUnsafe",
]);

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      /**
       * Measured, not guessed: with keepAlive on, a pooled connection to
       * Prisma Postgres survives at least 60s idle and answers in ~250ms,
       * while opening a new one costs 7s warm and 12.8s cold.
       *
       * This used to be 10s, on the theory that retiring connections early
       * avoids handing out a dead one. It did the opposite — it forced a 7s
       * handshake on almost every request after a pause, and the constant
       * reconnection churn was itself what produced the "Server has closed
       * the connection" failures. Hold connections; do not recycle them.
       */
      idleTimeoutMillis: 60_000,
      /**
       * Opening a connection to Prisma Postgres measured 7s warm and 12.8s
       * cold from here. The 10s this used to be sat between those two
       * numbers, so the first request after any quiet period failed with
       * "Connection terminated due to connection timeout" and the page 500'd.
       * Well clear of the cold-start figure, not merely above the warm one.
       */
      connectionTimeoutMillis: 30_000,
      max: 5,
      /**
       * The piece that was missing. Without TCP keepalive, something between
       * here and the database drops a quiet socket without telling either
       * end, and the next query finds it dead.
       */
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000,
    }),
  }).$extends({
    query: {
      async $allOperations({ operation, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          const retryable =
            READ_OPERATIONS.has(operation) &&
            error instanceof Error &&
            CONNECTION_LOST.test(error.message);
          if (!retryable) throw error;
          // The pool discards the broken client, so the retry gets a live one.
          return await query(args);
        }
      },
    },
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
