"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useLinkStatus } from "next/link";
import { ShelfMark } from "@/app/_components/shelf-mark";

/**
 * The OPAC's loading screen: the Shelf mark, large, its three books hopping
 * in turn, over the page blurred behind it (CDI request, after a small card
 * and before that a thin bar, both too easy to miss).
 *
 * It stays at least `MIN_SHOWN_MS` even when the page arrives sooner, so
 * the books get to hop and the change of page reads as one gesture (CDI
 * request), then fades out. One loader for the whole OPAC, mounted in the
 * layout: a link that starts it may be gone with its page before it ends.
 *
 * Anything can start it — a link (`LinkLoader`), a transition
 * (`useRouteLoader`) — and it ends once every one of them has.
 */

const MIN_SHOWN_MS = 900;
const FADE_MS = 200;

type Phase = "hidden" | "shown" | "leaving";

let phase: Phase = "hidden";
let active = 0;
let shownAt = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function set(next: Phase) {
  phase = next;
  listeners.forEach((listener) => listener());
}

function start() {
  active++;
  window.clearTimeout(timer);
  if (phase !== "shown") {
    if (phase === "hidden") shownAt = Date.now();
    set("shown");
  }
}

function stop() {
  active = Math.max(0, active - 1);
  if (active > 0) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(
    () => {
      set("leaving");
      timer = window.setTimeout(() => set("hidden"), FADE_MS);
    },
    Math.max(0, MIN_SHOWN_MS - (Date.now() - shownAt)),
  );
}

/** Shows the loader while `pending` is true, and for its minimum time after. */
export function useRouteLoader(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    start();
    return stop;
  }, [pending]);
}

/** Put inside a `<Link>`: the loader runs while that link's page loads. */
export function LinkLoader() {
  const { pending } = useLinkStatus();
  useRouteLoader(pending);
  return null;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function RouteLoader({ label }: { label: string }) {
  const current = useSyncExternalStore(
    subscribe,
    () => phase,
    () => "hidden" as Phase,
  );
  if (current === "hidden") return null;
  return (
    <div
      className={`fixed inset-0 z-[60] grid place-items-center bg-background/50 backdrop-blur-md transition-opacity duration-200 motion-reduce:backdrop-blur-sm ${
        current === "leaving" ? "opacity-0" : "animate-appear"
      }`}
    >
      <div className="stack items-center gap-4">
        <ShelfMark hopping className="w-32 overflow-visible drop-shadow-lg sm:w-40" />
        <p role="status" className="sr-only">
          {label}
        </p>
      </div>
    </div>
  );
}
