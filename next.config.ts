import type { NextConfig } from "next";

// Deliberately empty. `output: "standalone"` lived here for Prisma Compute,
// but it breaks the Vercel build: in standalone mode Next reads
// `.next/next-server.js.nft.json` to decide what to copy into
// `.next/standalone`, and on Vercel that file is absent, so the build dies
// with ENOENT. Vercel traces its own files and does not need it. Restore it
// only if this is ever deployed somewhere that runs `.next/standalone/server.js`.
const nextConfig: NextConfig = {};

export default nextConfig;
