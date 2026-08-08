import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by Prisma Compute: without it the deployed app never boots and
  // every request returns 504.
  output: "standalone",
};

export default nextConfig;
