"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Books that drift in a page's margins and, on wide screens, show a reading
 * quote when the pointer rests on one (CDI request) — part of the backdrop of
 * the sign-in page and of the catalogue home.
 *
 * The books sit behind the content, which would swallow ordinary hover
 * events, so the pointer is followed at the window level and matched against
 * each book's position instead. Quotes only show over bare background — never
 * while the pointer is on `avoid` — and for a mouse or pen only: touch has no
 * hover. Everything is decorative and hidden from assistive technology;
 * readers who ask for reduced motion get still books.
 *
 * The layer fills its containing block, and the quote card is positioned in
 * the same one, so both are measured against the layer.
 */

export type DriftingBook = {
  Icon: LucideIcon;
  colour: string;
  /** Position and size classes, e.g. "left-[2%] top-[26%] size-16". */
  place: string;
  tilt: number;
  seconds: number;
  delay: number;
};

type Quote = { text: string; author: string };
type Bubble = { index: number; quote: Quote; x: number; y: number; toRight: boolean };

export function QuoteBooks({
  books,
  quotes,
  avoid,
  className = "",
}: {
  books: DriftingBook[];
  quotes: Quote[];
  /** Content the pointer can be over, where a quote would only get in the way. */
  avoid: string;
  className?: string;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const icons = useRef<(SVGSVGElement | null)[]>([]);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  useEffect(() => {
    // Quotes only on wide screens (CDI request): below that the margins are
    // too narrow for the card, which would land on the content.
    const wide = window.matchMedia("(min-width: 80rem)");
    let hovered = -1;
    let lastQuote = -1;
    let pending = 0;
    let x = 0;
    let y = 0;

    const findTarget = () => {
      if (!wide.matches || document.elementFromPoint(x, y)?.closest(avoid)) return -1;
      return icons.current.findIndex((book) => {
        if (!book) return false;
        const box = book.getBoundingClientRect();
        return x >= box.left - 6 && x <= box.right + 6 && y >= box.top - 6 && y <= box.bottom + 6;
      });
    };

    const tick = () => {
      pending = 0;
      const index = findTarget();
      if (index === hovered || !layer.current) return;
      hovered = index;
      if (index === -1) {
        setBubble(null);
        return;
      }
      // A different quote from the last one, so a second look is rewarded.
      let pick = Math.floor(Math.random() * quotes.length);
      if (quotes.length > 1 && pick === lastQuote) pick = (pick + 1) % quotes.length;
      lastQuote = pick;
      const book = icons.current[index]!.getBoundingClientRect();
      const area = layer.current.getBoundingClientRect();
      const toRight = book.left + book.width / 2 < area.left + area.width / 2;
      setBubble({
        index,
        quote: quotes[pick],
        // Beside the book, on the side facing the middle of the page.
        x: toRight ? book.right - area.left + 12 : area.right - book.left + 12,
        y: book.top - area.top + book.height / 2,
        toRight,
      });
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      pending ||= requestAnimationFrame(tick);
    };
    const onLeave = () => {
      hovered = -1;
      setBubble(null);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(pending);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [quotes, avoid]);

  return (
    <>
      <div
        ref={layer}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      >
        {books.map(({ Icon, colour, place, tilt, seconds, delay }, i) => (
          <Icon
            key={place}
            ref={(element) => {
              icons.current[i] = element;
            }}
            className={`absolute ${place} ${colour} animate-drift transition-[opacity,scale] duration-300 motion-reduce:animate-none ${
              bubble?.index === i ? "scale-125 opacity-70" : "opacity-25"
            }`}
            strokeWidth={1.5}
            style={
              {
                "--tilt": `${tilt}deg`,
                rotate: `${tilt}deg`,
                animationDuration: `${seconds}s`,
                animationDelay: `${delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {bubble ? (
        <figure
          key={`${bubble.index}-${bubble.quote.author}`}
          aria-hidden="true"
          className="pointer-events-none absolute z-20 w-72 max-w-[45vw] -translate-y-1/2 rounded-card border border-border bg-surface p-4 shadow-popover transition-opacity duration-300 starting:opacity-0"
          style={
            bubble.toRight ? { left: bubble.x, top: bubble.y } : { right: bubble.x, top: bubble.y }
          }
        >
          <blockquote className="font-heading text-body font-medium leading-snug">
            {bubble.quote.text}
          </blockquote>
          <figcaption className="mt-2 text-caption text-foreground-muted">
            — {bubble.quote.author}
          </figcaption>
        </figure>
      ) : null}
    </>
  );
}
