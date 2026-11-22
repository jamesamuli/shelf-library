"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { fill, type Messages } from "@/lib/i18n";
import { setLikeAction } from "../_actions";
import { SignInPrompt, withParam } from "./sign-in-prompt";

/**
 * The heart, with the number of likes beside it (no word: CDI request).
 *
 * Signed in, it turns at once and the server catches up; a refusal or a
 * failed request turns it back. Signed out, it explains why to sign in
 * (`SignInPrompt`), and the sign-in returns with `?aimer=<id>`, which likes
 * the book on arrival — the reader asked for it before signing in, and a
 * like is harmless and undone with a tap.
 *
 * Keyed by the caller on the saved state, so a refresh after any like
 * brings both of a card's layouts in line with the server.
 *
 * `large` is the phone card's; the desktop card has a smaller one in its
 * bottom right corner.
 */
export function LikeButton({
  recordId,
  liked,
  count,
  signedIn,
  googleReady,
  returnTo,
  autoLike,
  large = false,
  messages,
}: {
  recordId: number;
  liked: boolean;
  count: number;
  signedIn: boolean;
  googleReady: boolean;
  returnTo: string;
  autoLike: boolean;
  large?: boolean;
  messages: Messages;
}) {
  const c = messages.catalogue;
  const [like, setLike] = useState({ liked, count });
  const [, startTransition] = useTransition();
  const button = useRef<HTMLButtonElement>(null);
  const prompt = useRef<HTMLDialogElement>(null);

  const save = (next: { liked: boolean; count: number }, before: typeof like) => {
    setLike(next);
    startTransition(async () => {
      const saved = await setLikeAction(recordId, next.liked).catch(() => false);
      if (!saved) setLike(before);
    });
  };

  useEffect(() => {
    // Each card has a desktop and a phone layout; only the one on screen acts.
    if (!autoLike || !signedIn || !button.current?.checkVisibility()) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("aimer");
    window.history.replaceState(window.history.state, "", url);
    // The action refreshes the page, and the card remounts this button with
    // the saved state (it is keyed on it), so nothing is set here.
    if (!liked) startTransition(() => setLikeAction(recordId, true).then(() => undefined));
  }, [autoLike, signedIn, liked, recordId]);

  const onClick = () => {
    if (!signedIn) {
      prompt.current?.showModal();
      return;
    }
    save({ liked: !like.liked, count: like.count + (like.liked ? -1 : 1) }, like);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-pressed={signedIn ? like.liked : undefined}
        aria-haspopup={signedIn ? undefined : "dialog"}
        title={c.like}
        onClick={onClick}
        className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring ${
          large ? "text-body font-semibold" : "text-body-sm font-medium text-foreground-muted"
        }`}
      >
        <Heart
          aria-hidden="true"
          strokeWidth={large ? 1.75 : 2}
          className={`transition-transform duration-200 motion-reduce:transition-none ${large ? "size-7" : "size-5"} ${
            like.liked ? "scale-110 fill-genre-raspberry text-genre-raspberry" : "text-foreground"
          }`}
        />
        <span aria-hidden="true" className="tabular-nums">
          {like.count}
        </span>
        <span className="sr-only">
          {c.like}, {fill(c.likeCount, { count: String(like.count) })}
        </span>
      </button>
      {signedIn ? null : (
        <SignInPrompt
          ref={prompt}
          id={`like-prompt-${recordId}${large ? "-phone" : ""}`}
          reason="like"
          next={withParam(returnTo, "aimer", recordId)}
          googleReady={googleReady}
          messages={messages}
        />
      )}
    </>
  );
}
