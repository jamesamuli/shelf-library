"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * "Revenir en haut", on phones, once the reader has scrolled a long way
 * down the results (CDI request) — which "Voir plus de livres" makes easy
 * to do. Above the bottom bar, and back to the results' heading, where the
 * search and the filters are.
 */
export function BackToTop({ label, target }: { label: string; target: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const update = () => setShown(window.scrollY > window.innerHeight * 1.5);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!shown) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const heading = document.getElementById(target);
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
        heading?.focus({ preventScroll: true });
      }}
      className="fixed bottom-24 right-4 z-30 grid size-12 place-items-center rounded-full bg-accent text-primary-foreground shadow-modal outline-offset-2 animate-appear focus-visible:outline-2 focus-visible:outline-ring sm:hidden"
    >
      <ArrowUp aria-hidden="true" className="size-6" strokeWidth={2.5} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
