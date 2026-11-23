"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useRouteLoader } from "../../_components/route-loader";

/**
 * A result card that opens its book wherever it is clicked (CDI request),
 * except on what has its own job: the authors, the buttons, the dialogs
 * they open, and text being selected. The title stays the real link — for
 * the keyboard, screen readers, a new tab, and pages without JavaScript —
 * so this is only a larger target for the pointer, and stays out of the
 * accessibility tree.
 */
export function ClickableCard({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useRouteLoader(pending);
  return (
    <article
      className={`cursor-pointer ${className}`}
      onClick={(event) => {
        const target = event.target as Element;
        if (target.closest("a, button, summary, dialog, input, select, label")) return;
        if (window.getSelection()?.toString()) return;
        startTransition(() => router.push(href));
      }}
    >
      {children}
    </article>
  );
}
