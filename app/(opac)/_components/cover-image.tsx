"use client";

import Image from "next/image";
import { useState } from "react";

// See next.config.ts: these go through the image optimiser and its cache.
const OPTIMISED = "https://covers.openlibrary.org/";

/**
 * Removes itself when the cover fails to load or turns out to be Open
 * Library's 1×1 "no cover" GIF, so the Shelf stand-in beneath shows cleanly
 * instead of a broken-image icon. next/image re-fires both events for an
 * image that settled before hydration, so none slips through.
 *
 * Open Library covers are optimised — fetched once by the server, resized
 * for the card, kept for a month by server and browser alike. A record's own
 * thumbnail URL can be on any host, which the optimiser would have to
 * allow-list one by one, so those load as they are.
 *
 * `eager` for the cards on screen at first paint: on a phone the first cover
 * is the largest thing on the page, so it should not wait behind lazy
 * loading.
 */
export function CoverImage({ src, eager = false }: { src: string; eager?: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <Image
      src={src}
      alt=""
      fill
      unoptimized={!src.startsWith(OPTIMISED)}
      // One card across a phone; a 13rem card (130 % scale) from `sm` up.
      sizes="(max-width: 639px) 90vw, 270px"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      className="object-cover"
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth <= 1) setMissing(true);
      }}
      onError={() => setMissing(true)}
    />
  );
}
