"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { fill, type Messages } from "@/lib/i18n";

/**
 * "Recommander", the phone card's paper plane (CDI request): the phone's
 * share sheet with the book's link and a sentence, or the link copied where
 * there is no share sheet. Nothing is stored.
 */
export function ShareButton({ recordId, title, messages }: { recordId: number; title: string; messages: Messages }) {
  const c = messages.catalogue;
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/catalogue/${recordId}`;
    if (navigator.share) {
      // A dismissed share sheet rejects; that is the reader's choice, not an error.
      await navigator.share({ title, text: fill(c.shareText, { title }), url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <button
        type="button"
        title={c.recommend}
        onClick={share}
        className="grid size-11 place-items-center rounded-full text-foreground outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Send aria-hidden="true" className="size-7 -rotate-12" strokeWidth={1.75} />
        <span className="sr-only">{c.recommend}</span>
      </button>
      <span role="status" className="text-caption text-foreground-muted">
        {copied ? c.linkCopied : ""}
      </span>
    </>
  );
}
