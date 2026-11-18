"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HANDOFF_CHANNEL } from "../_lib/google-channel";

const POPUP = { width: 480, height: 640 };

/**
 * "Se connecter avec Google" in a popup window (CDI request): the sign-in
 * page stays put while Google asks for the account, then goes where the
 * callback says — the reader's account, or the panel with Google's refusal —
 * without a full reload. The popup reports back over a BroadcastChannel (see
 * handoffPage in google.ts for why not `window.opener`).
 *
 * Still a real link underneath: without JavaScript, or when the browser
 * blocks the popup, the sign-in simply runs in this tab as before. A plain
 * <a>, not next/link: Link prefetches, and prefetching this route would start
 * a sign-in — and overwrite the flow cookie — on mere hover.
 *
 * Drawn per Google's sign-in branding rules: their four-colour "G" on a
 * neutral button, with the wording they prescribe.
 */
export function GoogleButton({
  label,
  pendingLabel,
  next,
}: {
  label: string;
  pendingLabel: string;
  next?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const query = new URLSearchParams(next ? { next } : {});
  const href = `/login/google${query.size ? `?${query}` : ""}`;

  useEffect(() => {
    const channel = new BroadcastChannel(HANDOFF_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ to?: unknown }>) => {
      const to = event.data?.to;
      // Same-site paths only, as the callback sends; anything else is ignored.
      if (typeof to !== "string" || !to.startsWith("/") || to.startsWith("//")) return;
      setPending(false);
      router.push(to);
    };
    // Back on this window with the popup gone and no word from it: the
    // reader closed it. The button is usable again.
    const onFocus = () => setPending(false);
    window.addEventListener("focus", onFocus);
    return () => {
      channel.close();
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const popupQuery = new URLSearchParams(query);
    popupQuery.set("popup", "1");
    // Centred over this window; on phones the browser opens a tab instead.
    const left = Math.round(window.screenX + (window.outerWidth - POPUP.width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - POPUP.height) / 2);
    const popup = window.open(
      `/login/google?${popupQuery}`,
      HANDOFF_CHANNEL,
      `popup,width=${POPUP.width},height=${POPUP.height},left=${left},top=${top}`,
    );
    // Blocked: let the link do its job in this tab.
    if (!popup) return;
    event.preventDefault();
    setPending(true);
  };

  return (
    <a
      href={href}
      onClick={onClick}
      aria-busy={pending || undefined}
      className="inline-flex min-h-12 max-w-full max-sm:min-h-14 items-center justify-center self-start gap-3 max-sm:w-full rounded-control border border-border-strong bg-surface px-5 py-2 text-left text-body font-medium text-foreground shadow-card outline-offset-2 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
    >
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5 shrink-0">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      {pending ? pendingLabel : label}
    </a>
  );
}
