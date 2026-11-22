"use client";

import Link from "next/link";
import { useId } from "react";
import { Bookmark, Heart } from "lucide-react";
import type { Messages } from "@/lib/i18n";
import { GoogleButton } from "@/app/(auth)/_components/google-button";
import { Modal } from "./modal";

/** `next` with one more query parameter, kept a same-site path. */
export function withParam(next: string, key: string, value: string | number) {
  const url = new URL(next, "http://x");
  url.searchParams.set(key, String(value));
  return url.pathname + url.search;
}

/** The icon's gradient, in the colours the reader already knows it by. */
const GRADIENTS = {
  like: ["var(--color-genre-raspberry)", "var(--color-genre-plum)"],
  reserve: ["var(--color-accent)", "var(--color-genre-indigo)"],
} as const;

/**
 * Asked of a signed-out reader who taps "J'aime" or "Réserver" (CDI
 * request), and kept to what a pupil needs at a glance, centred: the heart
 * or the bookmark, large, in a gradient and beating; one short sentence;
 * which account to use; the school's Google sign-in. No cancel button — the
 * small cross, Escape and a tap outside all close it.
 *
 * The sign-in runs in a popup and brings the reader back to `next` — this
 * same list, carrying what they asked for — so they never leave the page.
 * Once signed in, the page renders without this dialog, which closes with it.
 */
export function SignInPrompt({
  ref,
  id,
  reason,
  next,
  googleReady,
  messages,
}: {
  ref: React.Ref<HTMLDialogElement>;
  id: string;
  reason: "reserve" | "like";
  next: string;
  /** False when Google sign-in is not configured: fall back to the sign-in page. */
  googleReady: boolean;
  messages: Messages;
}) {
  const c = messages.catalogue;
  // Letters and digits only: React's ids carry characters `url(#…)` rejects.
  const gradient = `gradient-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const Icon = reason === "reserve" ? Bookmark : Heart;
  const [from, to] = GRADIENTS[reason];

  return (
    <Modal ref={ref} id={id} closeLabel={c.closePanel}>
      <div className="stack items-center gap-5 text-center">
        <span aria-hidden="true" className="relative grid size-32 place-items-center">
          {/* A soft glow in the same colours, behind the beating icon. */}
          <span
            className="absolute inset-3 rounded-full opacity-25 blur-xl"
            style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
          />
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={from} />
                <stop offset="100%" stopColor={to} />
              </linearGradient>
            </defs>
          </svg>
          <Icon
            className="relative size-24 animate-heartbeat motion-reduce:animate-none"
            fill={`url(#${gradient})`}
            stroke={`url(#${gradient})`}
            strokeWidth={1.5}
          />
        </span>
        <h2 id={`${id}-title`} className="font-heading text-heading-2 leading-tight text-balance">
          {reason === "reserve" ? c.signInReserveTitle : c.signInLikeTitle}
        </h2>
        <p className="text-body-sm text-foreground-muted text-balance">{c.signInSchoolHint}</p>
        {googleReady ? (
          <div className="flex justify-center [&>a]:self-center">
            <GoogleButton label={messages.google.signIn} pendingLabel={messages.signingIn} next={next} />
          </div>
        ) : (
          <Link
            href={`/login/opac?next=${encodeURIComponent(next)}`}
            className="flex min-h-12 items-center rounded-control bg-primary px-5 text-body font-semibold text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
          >
            {messages.signIn}
          </Link>
        )}
      </div>
    </Modal>
  );
}
