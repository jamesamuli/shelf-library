"use client";

import { Children, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ARROW =
  "absolute top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full border-2 border-primary bg-surface text-primary shadow-popover outline-offset-2 transition-opacity duration-200 hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-0 sm:size-12 pointer-coarse:hidden";

/** One page every 30 seconds (CDI request). */
const AUTOPLAY_MS = 30_000;

// A pixel of slack: fractional scroll offsets never quite reach the end.
const readEdges = (element: HTMLElement) => ({
  atStart: element.scrollLeft <= 1,
  atEnd: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
});

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A native horizontal scroller: it swipes on touch, scrolls with a trackpad,
 * and keyboard focus brings each card into view, all without this script.
 * The arrows and the autoplay are the only parts that need JavaScript. The
 * arrows float over the row's edges so the first card lines up with the
 * heading, and fade out at either end rather than sitting greyed over a cover.
 *
 * Autoplay pages forward, then back once it reaches the end, and so on. It
 * holds still while the pointer or keyboard focus is in the row — nothing
 * moves under a reader who is looking — and any manual move restarts its
 * countdown. There is no pause button (CDI decision, 2026-11-18): readers who
 * ask their system for reduced motion get no movement at all instead.
 */
export function Carousel({
  heading,
  backLabel,
  forwardLabel,
  children,
}: {
  heading: React.ReactNode;
  backLabel: string;
  forwardLabel: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  // Which card is in view, for the phone layout's position dots.
  const [position, setPosition] = useState(0);
  const count = Children.count(children);
  // Bumped by the arrows so a manual move restarts the countdown.
  const [lastNudge, setLastNudge] = useState(0);
  const direction = useRef<1 | -1>(1);
  const hovered = useRef(false);
  const focused = useRef(false);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    // Scroll fires every frame; only an edge flipping, or a new card coming
    // into view, is worth a render (React skips an unchanged position).
    const update = () => {
      const next = readEdges(element);
      setEdges((prev) =>
        prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next,
      );
      const first = element.firstElementChild as HTMLElement | null;
      if (first) {
        const step = first.offsetWidth + parseFloat(getComputedStyle(element).columnGap);
        setPosition(Math.round(element.scrollLeft / step));
      }
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const timer = window.setInterval(() => {
      if (hovered.current || focused.current || document.hidden || prefersReducedMotion()) {
        return;
      }
      const { atStart, atEnd } = readEdges(element);
      if (atStart && atEnd) return;
      if (direction.current === 1 && atEnd) direction.current = -1;
      else if (direction.current === -1 && atStart) direction.current = 1;
      element.scrollBy({ left: direction.current * element.clientWidth * 0.9, behavior: "smooth" });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [lastNudge]);

  const scroll = (step: 1 | -1) => {
    const element = track.current;
    if (!element) return;
    element.scrollBy({
      left: step * element.clientWidth * 0.9,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    direction.current = step;
    setLastNudge(Date.now());
  };

  return (
    // On phones the home gives the carousel a fixed height (one book filling
    // the screen); the row then takes all of it but the heading and dots.
    <div className="stack gap-content max-sm:h-full max-sm:min-h-0">
      {heading}
      <div
        className="relative max-sm:min-h-0 max-sm:flex-1"
        onPointerEnter={() => {
          hovered.current = true;
        }}
        onPointerLeave={() => {
          hovered.current = false;
        }}
        // Keyboard focus only: a clicked arrow keeps focus in most browsers,
        // and should not hold the row still once the pointer has left.
        onFocus={(event) => {
          focused.current = event.target.matches(":focus-visible");
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) focused.current = false;
        }}
      >
        {/* The arrows come before the row in the DOM, so the tab order is
            back, forward, then the cards — not two stray stops after the
            twelfth card. Their position is absolute either way. */}
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={edges.atStart}
          aria-label={backLabel}
          className={`${ARROW} left-0 -translate-x-1/3 sm:-translate-x-1/2`}
        >
          <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={edges.atEnd}
          aria-label={forwardLabel}
          className={`${ARROW} right-0 translate-x-1/3 sm:translate-x-1/2`}
        >
          <ChevronRight aria-hidden="true" className="size-6" strokeWidth={2.5} />
        </button>
        {/* No visible scrollbar: the arrows, swipe and trackpad do the
            moving — and on touch screens only the swipe, the arrows being in
            the way of the covers there. The padding is headroom for a card
            zooming on hover — an overflow-x container clips on both axes —
            and the matching negative margin keeps the first card flush with
            the heading. A swipe or a wheel turn restarts the autoplay
            countdown, as an arrow press does: the reader is driving. */}
        <ul
          ref={track}
          onPointerDown={() => setLastNudge(Date.now())}
          onWheel={() => setLastNudge(Date.now())}
          className="-mx-4 -my-5 flex snap-x snap-mandatory max-sm:h-[calc(100%+2.5rem)] scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain sm:gap-6 px-4 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </ul>
      </div>
      {/* Phones show one book at a time, so these say where in the row you
          are. Decorative: the list itself tells a screen reader how many. */}
      <div aria-hidden="true" className="flex justify-center gap-1.5 sm:hidden">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
              i === position ? "w-5 bg-accent" : "w-2 bg-border-strong"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
