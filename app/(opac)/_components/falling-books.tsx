"use client";

import { useEffect, useRef } from "react";
import { Book, BookMarked, BookOpen, BookText } from "lucide-react";
import { QuoteBooks, type DriftingBook } from "@/app/_components/quote-books";

/**
 * The catalogue home's backdrop (CDI request): small books fall from under
 * the header, bounce off the welcome heading and the search bar, land on the
 * new-arrivals panel, rest there a while — lying flat, or stacked on one that
 * landed first — and fade away. Beside the heading, books drift and quote on
 * wide screens, as on the sign-in page.
 *
 * A small physics loop rather than CSS keyframes, since where a book goes
 * depends on what it hits. What it hits is read from the page by attribute,
 * so the layout stays in charge: `data-book-bump` marks an obstacle ("text"
 * for a heading, whose lines are measured one by one rather than as one wide
 * box) and `data-book-floor` what they land on. The pointer pushes falling
 * books aside and knocks resting ones off.
 *
 * The layer fills the nearest positioned ancestor — the catalogue layout, so
 * books cross the full width and pass behind the header. The loop runs only
 * while the heading is on screen, never on phones (the carousel fills the
 * screen there), and not at all for readers who ask for reduced motion.
 */

const BOOKS = [
  { Icon: Book, colour: "text-genre-indigo" },
  { Icon: BookOpen, colour: "text-genre-ochre" },
  { Icon: BookMarked, colour: "text-genre-raspberry" },
  { Icon: BookText, colour: "text-genre-forest" },
  { Icon: Book, colour: "text-genre-violet" },
  { Icon: BookOpen, colour: "text-genre-terracotta" },
  { Icon: BookMarked, colour: "text-genre-teal" },
  { Icon: BookText, colour: "text-genre-plum" },
  { Icon: Book, colour: "text-genre-ochre" },
  { Icon: BookOpen, colour: "text-genre-raspberry" },
  { Icon: BookMarked, colour: "text-genre-indigo" },
  { Icon: BookText, colour: "text-genre-teal" },
];

// In the margins beside the heading; tops in rem from the top of the page.
const DRIFTERS: DriftingBook[] = [
  {
    Icon: BookOpen,
    colour: "text-genre-ochre",
    place: "left-[4%] top-[9rem] size-14",
    tilt: -14,
    seconds: 15,
    delay: 0,
  },
  {
    Icon: Book,
    colour: "text-genre-raspberry",
    place: "left-[13%] top-[15rem] size-10",
    tilt: 12,
    seconds: 12,
    delay: -5,
  },
  {
    Icon: BookMarked,
    colour: "text-genre-teal",
    place: "left-[6%] top-[19rem] size-12",
    tilt: -6,
    seconds: 17,
    delay: -9,
  },
  {
    Icon: BookText,
    colour: "text-genre-indigo",
    place: "right-[5%] top-[10rem] size-12",
    tilt: 16,
    seconds: 14,
    delay: -7,
  },
  {
    Icon: BookOpen,
    colour: "text-genre-violet",
    place: "right-[14%] top-[16rem] size-10",
    tilt: -20,
    seconds: 11,
    delay: -2,
  },
  {
    Icon: BookMarked,
    colour: "text-genre-plum",
    place: "right-[4%] top-[19rem] size-14",
    tilt: 8,
    seconds: 16,
    delay: -11,
  },
];

const CONTENT = "a, button, input, label, h1, h2, p, form, section, header";

/** Each book is drawn in a box this many px square, then scaled. */
const BOX = 32;
/** px/s²; with the drag, books fall at most about 120 px/s — floating, not dropping. */
const GRAVITY = 260;
const DRAG = 2.2;
/** Share of the speed a book keeps when it bounces off the heading. */
const BOUNCE = 0.45;
/** How close the pointer may come before it pushes a book, in px. */
const PUSH_RADIUS = 90;
const OPACITY = 0.5;

type Body = {
  el: HTMLSpanElement;
  state: "idle" | "falling" | "resting" | "fading";
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  /** The angle it settles at when it lands: flat or on end, never askew. */
  rest: number;
  scale: number;
  r: number;
  phase: number;
  squash: number;
  opacity: number;
  until: number;
};
type Box = { left: number; top: number; right: number; bottom: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const between = (min: number, max: number) => min + Math.random() * (max - min);

export function FallingBooks({ quotes }: { quotes: { text: string; author: string }[] }) {
  const layer = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const area = layer.current;
    const heading = document.querySelector("[data-book-bump]");
    if (!area || !heading) return;
    const big = window.matchMedia("(min-width: 40rem)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lines = document.createRange();
    const bodies = slots.current.flatMap((el): Body[] =>
      el
        ? [
            {
              el,
              state: "idle",
              x: 0,
              y: 0,
              vx: 0,
              vy: 0,
              angle: 0,
              spin: 0,
              rest: 0,
              scale: 1,
              r: 0,
              phase: 0,
              squash: 0,
              opacity: 0,
              until: 0,
            },
          ]
        : [],
    );
    let frame = 0;
    let last = 0;
    let nextDrop = 0;
    let primed = false;
    let onScreen = true;
    let pointer: { x: number; y: number } | null = null;

    // Read every frame: the page can reflow (fonts, resizing, the carousel
    // loading), and a handful of rectangles is cheap. Reads only; the loop's
    // writes are transforms, which never cause layout.
    const measure = () => {
      const frameBox = area.getBoundingClientRect();
      const local = (r: DOMRect): Box => ({
        left: r.left - frameBox.left,
        top: r.top - frameBox.top,
        right: r.right - frameBox.left,
        bottom: r.bottom - frameBox.top,
      });
      const obstacles: Box[] = [];
      document.querySelectorAll<HTMLElement>("[data-book-bump]").forEach((el) => {
        if (el.dataset.bookBump === "text") {
          lines.selectNodeContents(el);
          // A line box is taller than its letters (the leading above and
          // below), so books would bounce off thin air without the inset.
          for (const line of lines.getClientRects()) {
            const box = local(line);
            const height = box.bottom - box.top;
            obstacles.push({ ...box, top: box.top + height * 0.2, bottom: box.bottom - height * 0.12 });
          }
        } else {
          obstacles.push(local(el.getBoundingClientRect()));
        }
      });
      const floors = [...document.querySelectorAll("[data-book-floor]")].map(
        (el) => el.getBoundingClientRect().top - frameBox.top,
      );
      return {
        width: frameBox.width,
        floor: floors.length > 0 ? Math.min(...floors) : frameBox.height,
        obstacles: obstacles.filter((o) => o.right > o.left),
        pointer: pointer && { x: pointer.x - frameBox.left, y: pointer.y - frameBox.top },
      };
    };
    type World = ReturnType<typeof measure>;

    const drop = (b: Body, world: World, y: number) => {
      b.scale = between(0.6, 1.15);
      b.r = (BOX / 2) * b.scale * 0.8;
      b.x = between(b.r, world.width - b.r);
      b.y = y;
      b.vx = between(-20, 20);
      b.vy = between(30, 70);
      b.angle = between(0, 360);
      b.spin = between(-45, 45);
      b.phase = between(0, Math.PI * 2);
      b.squash = 0;
      b.opacity = OPACITY;
      b.state = "falling";
    };

    // What is under a book: the floor, or a book that landed before it.
    const supportUnder = (b: Body, world: World) => {
      let support = world.floor;
      for (const o of bodies) {
        if (o === b || (o.state !== "resting" && o.state !== "fading") || o.y <= b.y) continue;
        if (Math.abs(o.x - b.x) < (o.r + b.r) * 0.75) support = Math.min(support, o.y - o.r);
      }
      return support;
    };

    const bump = (b: Body, o: Box) => {
      const cx = clamp(b.x, o.left, o.right);
      const cy = clamp(b.y, o.top, o.bottom);
      const d = Math.hypot(b.x - cx, b.y - cy);
      if (d >= b.r) return;
      let nx: number;
      let ny: number;
      if (d > 0) {
        nx = (b.x - cx) / d;
        ny = (b.y - cy) / d;
        b.x = cx + nx * b.r;
        b.y = cy + ny * b.r;
      } else {
        // Its centre is inside (the page moved under it): out the nearest side.
        const sides = [b.x - o.left, o.right - b.x, b.y - o.top, o.bottom - b.y];
        const side = sides.indexOf(Math.min(...sides));
        [nx, ny] = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ][side];
        if (side === 0) b.x = o.left - b.r;
        if (side === 1) b.x = o.right + b.r;
        if (side === 2) b.y = o.top - b.r;
        if (side === 3) b.y = o.bottom + b.r;
      }
      const vn = b.vx * nx + b.vy * ny;
      if (vn >= 0) return;
      if (ny < -0.6) {
        // On top of the text: a visible hop, and off towards the nearer end,
        // so none settles on it. A grazing touch only nudges it along.
        const away = Math.sign(b.x - (o.left + o.right) / 2) || 1;
        if (vn < -40) {
          b.vy = -Math.max(-vn * BOUNCE, between(120, 170));
          b.vx = away * between(80, 220);
          b.spin += between(-320, 320);
        } else {
          b.vy = 0;
          b.vx = clamp(b.vx + away * 8, -240, 240);
        }
        return;
      }
      b.vx -= (1 + BOUNCE) * vn * nx;
      b.vy -= (1 + BOUNCE) * vn * ny;
      b.spin += between(-260, 260);
    };

    const step = (b: Body, world: World, dt: number, t: number) => {
      // Unit vector from the pointer to the book, and how close it is.
      const p = world.pointer;
      const d = p ? Math.hypot(b.x - p.x, b.y - p.y) || 1 : Infinity;
      const near = p !== null && d < PUSH_RADIUS;
      const ux = p ? (b.x - p.x) / d : 0;
      const uy = p ? (b.y - p.y) / d : 0;

      if (b.state === "falling") {
        b.vy += (GRAVITY - DRAG * b.vy) * dt;
        b.vx *= Math.exp(-0.8 * dt);
        if (near) {
          const force = (1 - d / PUSH_RADIUS) * 2400 * dt;
          b.vx += ux * force;
          b.vy += uy * force;
        }
        // A sway on top of the velocity, as a leaf or a sheet of paper falls.
        b.x += (b.vx + Math.sin(t * 1.6 + b.phase) * 28) * dt;
        b.y += b.vy * dt;
        b.spin *= Math.exp(-0.6 * dt);
        b.angle += b.spin * dt;
        for (const o of world.obstacles) bump(b, o);
        if (b.x < b.r || b.x > world.width - b.r) {
          b.x = clamp(b.x, b.r, world.width - b.r);
          b.vx = -b.vx * 0.5;
        }
        const support = supportUnder(b, world);
        if (b.y + b.r >= support) {
          b.y = support - b.r;
          b.squash = clamp(b.vy / 600, 0.08, 0.3);
          if (b.vy > 140) {
            b.vy = -b.vy * 0.3;
            b.vx *= 0.6;
          } else {
            b.state = "resting";
            b.vx = 0;
            b.vy = 0;
            b.rest = Math.round(b.angle / 90) * 90;
            b.until = t + between(3, 6);
          }
        }
        return;
      }

      if (near) {
        // Knocked off the pile.
        b.state = "falling";
        b.vx = ux * 160;
        b.vy = -180;
        b.spin = between(-300, 300);
        b.opacity = OPACITY;
        return;
      }
      b.angle += (b.rest - b.angle) * Math.min(1, 10 * dt);
      const support = supportUnder(b, world);
      // The book below it has gone, or the page moved: fall again — or, one
      // already fading, just sink onto what is left as it goes.
      if (b.y + b.r >= support - 1) b.y = support - b.r;
      else if (b.state === "resting") b.state = "falling";
      else b.y = Math.min(support - b.r, b.y + 150 * dt);

      if (b.state === "resting" && t >= b.until) {
        b.state = "fading";
        b.until = t + 1.2;
      }
      if (b.state === "fading") {
        b.opacity = OPACITY * Math.max(0, (b.until - t) / 1.2);
        if (b.opacity === 0) b.state = "idle";
      }
    };

    const draw = (b: Body, dt: number) => {
      if (b.state === "idle") {
        b.el.style.opacity = "0";
        return;
      }
      const s = b.scale;
      const q = b.squash;
      b.squash *= Math.exp(-9 * dt);
      // Squashed along the page's vertical, whatever the book's angle, and
      // lowered by as much, so it squashes onto what it landed on.
      b.el.style.transform = `translate(${b.x - BOX / 2}px, ${b.y - BOX / 2 + b.r * q}px) scale(${s * (1 + q * 0.6)}, ${s * (1 - q)}) rotate(${b.angle}deg)`;
      b.el.style.opacity = String(b.opacity);
    };

    const tick = (now: number) => {
      const t = now / 1000;
      const dt = Math.min(0.05, t - last);
      last = t;
      const world = measure();
      if (!primed) {
        // A few already on their way, so the page does not open empty.
        primed = true;
        bodies.slice(0, 4).forEach((b) => drop(b, world, between(0, world.floor * 0.6)));
        nextDrop = t + 0.6;
      }
      if (t >= nextDrop) {
        const free = bodies.find((b) => b.state === "idle");
        if (free) drop(free, world, -BOX);
        nextDrop = t + between(1.1, 2.6);
      }
      for (const b of bodies) {
        if (b.state !== "idle") step(b, world, dt, t);
        draw(b, dt);
      }
      frame = requestAnimationFrame(tick);
    };

    const sync = () => {
      const run = onScreen && big.matches && !still.matches;
      if (run && !frame) {
        last = performance.now() / 1000;
        frame = requestAnimationFrame(tick);
      } else if (!run && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const visible = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    visible.observe(heading);
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") pointer = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      pointer = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    big.addEventListener("change", sync);
    still.addEventListener("change", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      visible.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      big.removeEventListener("change", sync);
      still.removeEventListener("change", sync);
    };
  }, []);

  return (
    <>
      <div
        ref={layer}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden max-sm:hidden motion-reduce:hidden"
      >
        {BOOKS.map(({ Icon, colour }, i) => (
          <span
            key={i}
            ref={(element) => {
              slots.current[i] = element;
            }}
            className="absolute left-0 top-0 opacity-0 will-change-transform"
            style={{ width: BOX, height: BOX }}
          >
            <Icon className={`size-full ${colour}`} strokeWidth={1.75} />
          </span>
        ))}
      </div>
      {/* Only where the margins beside the heading are wide enough for them. */}
      <QuoteBooks books={DRIFTERS} quotes={quotes} avoid={CONTENT} className="max-lg:hidden" />
    </>
  );
}
