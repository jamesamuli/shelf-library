"use client";

import { useEffect, useRef } from "react";
import { Book, BookMarked, BookOpen, BookText, type LucideIcon } from "lucide-react";
import { QuoteBooks, type DriftingBook } from "@/app/_components/quote-books";

/**
 * The sign-in page's backdrop, in the genre colours (CDI request): books that
 * drift in the margins and quote on wide screens (QuoteBooks), and books that
 * fall across the whole page and dodge the pointer.
 *
 * The layer sits behind the content, which would swallow ordinary pointer
 * events, so the pointer is followed at the window level and matched against
 * each book's position instead. Mouse and pen only. Everything is decorative
 * and hidden from assistive technology; readers who ask for reduced motion
 * get no falling books.
 */

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
const DRIFTERS: DriftingBook[] = [
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

export function FloatingBooks({ quotes }: { quotes: { text: string; author: string }[] }) {
  const fallers = useRef<(HTMLSpanElement | null)[]>([]);
  const offsets = useRef(FALLERS.map(() => ({ x: 0, y: 0 })));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pending = 0;
    let x = 0;
    let y = 0;

    const flee = () => {
      pending = 0;
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

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      pending ||= requestAnimationFrame(flee);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(pending);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <>
      <div
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
      </div>
      {/* Not on phones: there are no margins to keep them out of the text,
          and touch cannot hover them for a quote anyway. */}
      <QuoteBooks books={DRIFTERS} quotes={quotes} avoid={CONTENT} className="max-md:hidden" />
    </>
  );
}
