"use client";

import { CircleX, X } from "lucide-react";

/**
 * A centred dialog with a teal title bar, after the CDI's reference design
 * for the copies list. A native modal dialog, so the focus trap, Escape and
 * the inert page behind come with it; a click on the dimmed backdrop closes
 * it too. Opened by the caller through `ref.current.showModal()`.
 *
 * Without a `title` it is bare: a narrow card with only a small close
 * button, for content that carries its own heading — which must then have
 * the id `${id}-title`, the dialog's accessible name.
 */
export function Modal({
  ref,
  id,
  title,
  closeLabel,
  onClose,
  children,
}: {
  ref: React.Ref<HTMLDialogElement>;
  id: string;
  title?: string;
  closeLabel: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className={`m-auto max-w-none ${title === undefined ? "w-[min(26rem,calc(100%-2rem))]" : "w-[min(56rem,calc(100%-2rem))]"} overflow-hidden rounded-panel border-2 border-accent bg-surface p-0 text-foreground opacity-0 shadow-modal transition-[opacity,scale,display,overlay] transition-discrete duration-200 ease-out backdrop:bg-black/50 open:scale-100 open:opacity-100 motion-reduce:transition-none starting:open:scale-95 starting:open:opacity-0`}
    >
      {title === undefined ? (
        <div className="relative max-h-[85dvh] overflow-y-auto px-6 pb-8 pt-10 sm:px-10">
          <form method="dialog" className="absolute right-2 top-2">
            <button
              type="submit"
              aria-label={closeLabel}
              className="grid size-11 place-items-center rounded-full text-foreground-muted outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </form>
          {children}
        </div>
      ) : (
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-4 bg-accent px-5 py-4 text-primary-foreground sm:px-6">
          <h2 id={`${id}-title`} className="font-heading text-heading-3 leading-tight">
            {title}
          </h2>
          <form method="dialog">
            <button
              type="submit"
              aria-label={closeLabel}
              className="grid size-11 shrink-0 place-items-center rounded-full outline-offset-2 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-primary-foreground"
            >
              <CircleX aria-hidden="true" className="size-8" strokeWidth={2} />
            </button>
          </form>
        </div>
        <div className="stack gap-4 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
      )}
    </dialog>
  );
}
