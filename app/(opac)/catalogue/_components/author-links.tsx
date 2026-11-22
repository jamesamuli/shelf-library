"use client";

import Link from "next/link";
import { Fragment, useId, useRef, useState } from "react";
import { Building2, ExternalLink, UserRound } from "lucide-react";
import { ShelfMark } from "@/app/_components/shelf-mark";
import type { AuthorLink, PublisherLink } from "@/lib/catalogue";
import { fill, type Messages } from "@/lib/i18n";
import { Availability } from "../../_components/availability";
import { CoverImage } from "../../_components/cover-image";
import { authorCardAction, publisherCardAction } from "../_actions";
import type { EntityCard } from "../_lib/state";
import { Modal } from "./modal";

type Loaded = EntityCard | "loading" | "missing" | null;
type Kind = "author" | "publisher";

const KINDS = {
  author: { Icon: UserRound, load: authorCardAction, href: (id: number) => `/catalogue/auteur/${id}` },
  publisher: { Icon: Building2, load: publisherCardAction, href: (id: number) => `/catalogue?q=&editeur=${id}` },
} as const;

/**
 * An author's or a publisher's name: a dialog with who they are and their
 * books in the CDI (CDI requests), instead of a page change. Fetched the
 * first time it opens — three database operations, and only then. Still a
 * real link (the author's page; the catalogue filtered by publisher), which
 * is where it goes without JavaScript and where "see all" leads.
 */
export function EntityName({
  kind,
  entity,
  messages,
}: {
  kind: Kind;
  entity: AuthorLink | PublisherLink;
  messages: Messages;
}) {
  const c = messages.catalogue;
  const dialog = useRef<HTMLDialogElement>(null);
  // The same name appears in a card's desktop and phone layouts.
  const uid = useId();
  const [card, setCard] = useState<Loaded>(null);
  const { Icon, load, href } = KINDS[kind];

  const open = (event: React.MouseEvent) => {
    // A new tab, or a modified click, still follows the link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    dialog.current?.showModal();
    if (card !== null && card !== "missing") return;
    setCard("loading");
    load(entity.id)
      .then((loaded) => setCard(loaded ?? "missing"))
      .catch(() => setCard("missing"));
  };

  const paragraphs =
    card && typeof card === "object" ? (card.text?.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()) ?? []) : [];

  return (
    <>
      <Link
        href={href(entity.id)}
        onClick={open}
        aria-haspopup="dialog"
        className="rounded-control underline-offset-2 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {entity.name}
      </Link>
      <Modal ref={dialog} id={`${kind}-${entity.id}-${uid}`} title={entity.name} closeLabel={c.closePanel}>
        {card === "loading" || card === null ? (
          <p role="status" className="text-body-sm text-foreground-muted">
            {c.authorLoading}
          </p>
        ) : card === "missing" ? (
          <p className="text-body-sm text-foreground-muted">{c.notFoundHint}</p>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-primary-foreground"
              >
                <Icon className="size-7" strokeWidth={1.75} />
              </span>
              <div className="stack gap-2">
                {card.detail ? <p className="text-body-sm font-semibold text-foreground-muted">{card.detail}</p> : null}
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-body">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-body-sm text-foreground-muted">
                    {kind === "author" ? c.noBiography : c.noPublisherDescription}
                  </p>
                )}
                {/^https?:\/\//.test(card.website ?? "") ? (
                  <a
                    href={card.website ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-accent underline underline-offset-2"
                  >
                    {c.authorWebsite}
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                ) : null}
              </div>
            </div>

            <h3 className="font-heading text-heading-3">
              {c.authorBooksShort} <span className="text-body font-normal text-foreground-muted">({card.total})</span>
            </h3>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {card.books.map((book) => (
                <li key={book.id}>
                  <Link
                    href={`/catalogue/${book.id}`}
                    className="group stack gap-2 rounded-card outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="relative block aspect-[2/3] overflow-hidden rounded-control bg-surface-muted shadow-card">
                      <span aria-hidden="true" className="absolute inset-0 grid place-items-center p-3">
                        <ShelfMark className="w-1/2" />
                      </span>
                      {book.coverUrl ? (
                        <span className="absolute inset-0 transition-[scale] duration-500 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                          <CoverImage src={book.coverUrl} sizes="(max-width: 639px) 45vw, 12rem" />
                        </span>
                      ) : null}
                    </span>
                    <span className="line-clamp-2 text-body-sm font-semibold group-hover:underline">
                      {book.title}
                      {book.year ? <span className="font-normal text-foreground-muted"> · {book.year}</span> : null}
                    </span>
                    <Availability totalItems={book.totalItems} availableItems={book.availableItems} messages={messages} />
                  </Link>
                </li>
              ))}
            </ul>
            {card.total > card.books.length ? (
              <Link
                href={card.allHref}
                className="w-fit text-body-sm font-semibold text-accent underline underline-offset-2 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {fill(c.authorAllBooks, { count: String(card.total) })}
              </Link>
            ) : null}
          </>
        )}
      </Modal>
    </>
  );
}

/**
 * A record's authors, comma-separated, each opening their dialog. A `div`,
 * not a `p`: each name carries its `<dialog>`, which a paragraph may not
 * contain — the browser would split the paragraph and React fail to hydrate.
 */
export function AuthorLinks({
  authors,
  className,
  messages,
}: {
  authors: AuthorLink[];
  className: string;
  messages: Messages;
}) {
  if (authors.length === 0) return null;
  return (
    <div className={className}>
      {authors.map((author, index) => (
        <Fragment key={author.id}>
          {index > 0 ? ", " : null}
          <EntityName kind="author" entity={author} messages={messages} />
        </Fragment>
      ))}
    </div>
  );
}
