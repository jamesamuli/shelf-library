"use server";

import { refresh } from "next/cache";
import { getSession } from "@/app/(auth)/_lib/session";
import { getAuthor, getPublisher, searchCatalogue } from "@/lib/catalogue";
import { reserveTitle } from "@/lib/holds";
import { setLike } from "@/lib/likes";
import type { EntityCard, ReserveState, SheetHit } from "./_lib/state";

/**
 * A reader reserving a title from the results. The reader is the session's,
 * never the form's: the record id is the only thing taken from the payload.
 * Signed-out readers never reach this — their button opens the sign-in
 * prompt — so a missing session is answered as a refusal, not a redirect.
 */
export async function reserveAction(
  _previous: ReserveState,
  formData: FormData,
): Promise<ReserveState> {
  const session = await getSession("opac");
  const recordId = Number(formData.get("recordId"));
  if (!session) return { kind: "error", reason: "PATRON_NOT_ALLOWED" };
  if (!Number.isInteger(recordId)) return { kind: "error", reason: "RECORD_NOT_FOUND" };

  const result = await reserveTitle(Number(session.sub), recordId);
  if (!result.ok) return { kind: "error", reason: result.reason };
  return { kind: "ok", title: result.title };
}

/** Books shown in a dialog before it points to the full list. */
const DIALOG_BOOKS = 8;

/** An author's or a publisher's books the CDI holds, visible to this reader, newest first. */
async function booksOf(filter: { authorId: number } | { publisherId: number }) {
  const session = await getSession("opac");
  const results = await searchCatalogue({ query: "", page: 1, isSubscriber: session !== null, sort: "annee", ...filter });
  return {
    total: results.total,
    books: results.hits.slice(0, DIALOG_BOOKS).map((hit) => ({
      id: hit.id,
      title: hit.title,
      year: hit.publicationYear,
      coverUrl: hit.coverUrl,
      totalItems: hit.totalItems,
      availableItems: hit.availableItems,
    })),
  };
}

/**
 * The author dialog's content, fetched when it opens. Null for an unknown
 * author. Three database operations, only when a reader opens one.
 */
export async function authorCardAction(authorId: number): Promise<EntityCard | null> {
  if (!Number.isInteger(authorId)) return null;
  const author = await getAuthor(authorId);
  if (!author) return null;
  return {
    name: author.name,
    detail: author.dates,
    text: author.biography,
    website: author.website,
    allHref: `/catalogue/auteur/${author.id}`,
    ...(await booksOf({ authorId })),
  };
}

/**
 * The publisher dialog (CDI request): its description and its books in the
 * CDI, the same way, and as cheaply — nothing runs until a reader opens it.
 */
export async function publisherCardAction(publisherId: number): Promise<EntityCard | null> {
  if (!Number.isInteger(publisherId)) return null;
  const publisher = await getPublisher(publisherId);
  if (!publisher) return null;
  return {
    name: publisher.name,
    detail: publisher.place,
    text: publisher.description,
    website: publisher.website,
    allHref: `/catalogue?q=&editeur=${publisher.id}`,
    ...(await booksOf({ publisherId })),
  };
}

/** Likes or unlikes for the signed-in reader; false when nobody is signed in. */
export async function setLikeAction(recordId: number, liked: boolean): Promise<boolean> {
  const session = await getSession("opac");
  if (!session || !Number.isInteger(recordId)) return false;
  const done = await setLike(Number(session.sub), recordId, liked === true);
  // The account's favourites and every count on the page follow.
  if (done) refresh();
  return done;
}

/**
 * The phone's search sheet (CDI request): the first page of results shown
 * in the sheet itself, instead of a page change the reader could not easily
 * come back from. Same search, same visibility rules as the results page.
 */
export async function sheetSearchAction(query: string): Promise<{ hits: SheetHit[]; total: number }> {
  const session = await getSession("opac");
  const results = await searchCatalogue({
    query: String(query).slice(0, 200),
    page: 1,
    isSubscriber: session !== null,
    sort: "pertinence",
  });
  return {
    total: results.total,
    hits: results.hits.map((hit) => ({
      id: hit.id,
      title: hit.title,
      authors: hit.authors.map((author) => author.name),
      coverUrl: hit.coverUrl,
      totalItems: hit.totalItems,
      availableItems: hit.availableItems,
    })),
  };
}
