"use client";

import { useEffect, useRef, useState } from "react";
import { Book, BookMarked, BookOpen, BookText, type LucideIcon } from "lucide-react";

/**
 * The sign-in page's backdrop, in the genre colours (CDI request): books that
 * drift in the margins and, on wide screens, show a reading quote when the
 * pointer rests on one, and books that fall across the whole page and dodge
 * the pointer.
 *
 * The layer sits behind the content, which would swallow ordinary hover
 * events, so the pointer is followed at the window level and matched against
 * each book's position instead. Quotes only show over bare background — not
 * through a card a book happens to drift behind. Mouse and pen only: touch has
 * no hover. Everything is decorative and hidden from assistive technology;
 * readers who ask for reduced motion get still books and no falling ones.
 */

type Drifter = {
  Icon: LucideIcon;
  colour: string;
  place: string;
  tilt: number;
  seconds: number;
  delay: number;
};
type Faller = {
  Icon: LucideIcon;
  colour: string;
  left: string;
  size: string;
  tilt: number;
  seconds: number;
  delay: number;
};

// Kept to the side margins and below the content, clear of the header.
const DRIFTERS: Drifter[] = [
  {
    Icon: BookOpen,
    colour: "text-genre-ochre",
    place: "left-[2%] top-[26%] size-16",
    tilt: -14,
    seconds: 15,
    delay: 0,
  },
  {
    Icon: Book,
    colour: "text-genre-raspberry",
    place: "left-[4%] top-[52%] size-12",
    tilt: 12,
    seconds: 12,
    delay: -5,
  },
  {
    Icon: BookMarked,
    colour: "text-genre-teal",
    place: "left-[3%] top-[78%] size-14",
    tilt: -6,
    seconds: 17,
    delay: -9,
  },
  {
    Icon: BookText,
    colour: "text-genre-indigo",
    place: "left-[26%] top-[88%] size-10",
    tilt: 18,
    seconds: 13,
    delay: -3,
  },
  {
    Icon: BookOpen,
    colour: "text-genre-violet",
    place: "right-[2%] top-[24%] size-14",
    tilt: 16,
    seconds: 14,
    delay: -7,
  },
  {
    Icon: Book,
    colour: "text-genre-forest",
    place: "right-[4%] top-[46%] size-10",
    tilt: -20,
    seconds: 11,
    delay: -2,
  },
  {
    Icon: BookMarked,
    colour: "text-genre-plum",
    place: "right-[3%] top-[66%] size-16",
    tilt: 8,
    seconds: 16,
    delay: -11,
  },
  {
    Icon: BookText,
    colour: "text-genre-terracotta",
    place: "right-[24%] top-[86%] size-12",
    tilt: -10,
    seconds: 18,
    delay: -6,
  },
  {
    Icon: BookOpen,
    colour: "text-genre-teal",
    place: "left-[44%] top-[4%] size-10",
    tilt: 6,
    seconds: 13,
    delay: -8,
  },
];

// One per lane across the page; negative delays so they start mid-fall.
const FALLERS: Faller[] = [
  {
    Icon: Book,
    colour: "text-genre-indigo",
    left: "left-[7%]",
    size: "size-9",
    tilt: 10,
    seconds: 19,
    delay: -2,
  },
  {
    Icon: BookOpen,
    colour: "text-genre-ochre",
    left: "left-[19%]",
    size: "size-11",
    tilt: -30,
    seconds: 24,
    delay: -14,
  },
  {
    Icon: BookMarked,
    colour: "text-genre-raspberry",
    left: "left-[33%]",
    size: "size-8",
    tilt: 45,
    seconds: 17,
    delay: -6,
  },
  {
    Icon: BookText,
    colour: "text-genre-forest",
    left: "left-[51%]",
    size: "size-10",
    tilt: -12,
    seconds: 22,
    delay: -18,
  },
  {
    Icon: Book,
    colour: "text-genre-violet",
    left: "left-[64%]",
    size: "size-9",
    tilt: 25,
    seconds: 20,
    delay: -9,
  },
  {
    Icon: BookOpen,
    colour: "text-genre-terracotta",
    left: "left-[78%]",
    size: "size-11",
    tilt: -40,
    seconds: 26,
    delay: -3,
  },
  {
    Icon: BookMarked,
    colour: "text-genre-teal",
    left: "left-[90%]",
    size: "size-8",
    tilt: 15,
    seconds: 18,
    delay: -12,
  },
];

/** How close the pointer may come before a falling book moves away, in px. */
const FLEE_RADIUS = 110;
/** How far a book may be pushed from its lane, so none leaves for good. */
const FLEE_LIMIT = 260;

// Content the pointer can be over, where a quote would only get in the way.
const CONTENT =
  "a, button, input, label, h1, h2, p, [role=tablist], [role=tabpanel] section, header";

type Quote = { text: string; author: string };
type Bubble = { index: number; quote: Quote; x: number; y: number; toRight: boolean };

export function FloatingBooks({ quotes }: { quotes: Quote[] }) {
  const layer = useRef<HTMLDivElement>(null);
  const drifters = useRef<(SVGSVGElement | null)[]>([]);
  const fallers = useRef<(HTMLSpanElement | null)[]>([]);
  const offsets = useRef(FALLERS.map(() => ({ x: 0, y: 0 })));
  const [bubble, setBubble] = useState<Bubble | null>(null);

  useEffect(() => {
    const frame = layer.current?.parentElement;
    if (!frame) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Quotes only on wide screens (CDI request): below that the margins are
    // too narrow for the card, which would land on the form.
    const wide = window.matchMedia("(min-width: 80rem)");
    let hovered = -1;
    let lastQuote = -1;
    let pending = 0;
    let x = 0;
    let y = 0;

    const flee = () => {
      fallers.current.forEach((lane, i) => {
        const book = lane?.firstElementChild;
        if (!lane || !book) return;
        const box = book.getBoundingClientRect();
        const dx = box.left + box.width / 2 - x;
        const dy = box.top + box.height / 2 - y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance >= FLEE_RADIUS) return;
        const push = (FLEE_RADIUS - distance) * 0.6;
        const offset = offsets.current[i];
        const clamp = (value: number) => Math.max(-FLEE_LIMIT, Math.min(FLEE_LIMIT, value));
        offset.x = clamp(offset.x + (dx / distance) * push);
        offset.y = clamp(offset.y + (dy / distance) * push);
        lane.style.translate = `${offset.x}px ${offset.y}px`;
      });
    };

    const findQuoteTarget = () => {
      if (!wide.matches || document.elementFromPoint(x, y)?.closest(CONTENT)) return -1;
      return drifters.current.findIndex((book) => {
        if (!book) return false;
        const box = book.getBoundingClientRect();
        return x >= box.left - 6 && x <= box.right + 6 && y >= box.top - 6 && y <= box.bottom + 6;
      });
    };

    const tick = () => {
      pending = 0;
      if (!still) flee();
      const index = findQuoteTarget();
      if (index === hovered) return;
      hovered = index;
      if (index === -1) {
        setBubble(null);
        return;
      }
      // A different quote from the last one, so a second look is rewarded.
      let pick = Math.floor(Math.random() * quotes.length);
      if (quotes.length > 1 && pick === lastQuote) pick = (pick + 1) % quotes.length;
      lastQuote = pick;
      const book = drifters.current[index]!.getBoundingClientRect();
      const area = frame.getBoundingClientRect();
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
  }, [quotes]);

  return (
    <>
      <div
        ref={layer}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [container-type:size]"
      >
        {FALLERS.map(({ Icon, colour, left, size, tilt, seconds, delay }, i) => (
          <span
            key={`fall-${left}`}
            ref={(element) => {
              fallers.current[i] = element;
            }}
            // Half the lanes on phones, so a narrow page is not crowded.
            className={`absolute top-0 ${left} transition-[translate] duration-500 ease-out motion-reduce:hidden ${
              i % 2 === 1 ? "max-md:hidden" : ""
            }`}
          >
            <Icon
              className={`${size} ${colour} block animate-fall opacity-20`}
              strokeWidth={1.5}
              style={
                {
                  "--tilt": `${tilt}deg`,
                  animationDuration: `${seconds}s`,
                  animationDelay: `${delay}s`,
                } as React.CSSProperties
              }
            />
          </span>
        ))}
        {DRIFTERS.map(({ Icon, colour, place, tilt, seconds, delay }, i) => (
          <Icon
            key={`drift-${place}`}
            ref={(element) => {
              drifters.current[i] = element;
            }}
            // Not on phones: there are no margins to keep them out of the
            // text, and touch cannot hover them for a quote anyway.
            className={`absolute ${place} ${colour} animate-drift transition-[opacity,scale] duration-300 max-md:hidden motion-reduce:animate-none ${
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
