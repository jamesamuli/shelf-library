import type { NextConfig } from "next";

// No `output: "standalone"`: it lived here for Prisma Compute, but it breaks
// the Vercel build — in standalone mode Next reads
// `.next/next-server.js.nft.json` to decide what to copy into
// `.next/standalone`, and on Vercel that file is absent, so the build dies
// with ENOENT. Vercel traces its own files and does not need it. Restore it
// only if this is ever deployed somewhere that runs `.next/standalone/server.js`.
const nextConfig: NextConfig = {
  images: {
    // Open Library covers go through the image optimiser. Fetched straight
    // from the browser, each one is two redirects across two hosts ending in
    // an image pulled out of a zip archive — several seconds — and browsers
    // keep the result for only three hours. Optimised, the server fetches a
    // cover once, keeps a resized WebP copy, and browsers keep that too. A
    // record's own thumbnail can live on any host, so those stay unoptimised
    // (see cover-image.tsx). The redirects are followed without re-checking
    // these patterns (at most `maximumRedirects`, 3 by default).
    remotePatterns: [new URL("https://covers.openlibrary.org/b/isbn/**")],
    // A cover for a given ISBN does not change: keep copies for 31 days.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
};

export default nextConfig;
