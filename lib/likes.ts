import { prisma } from "./prisma";

/**
 * A reader's "J'aime" (CDI request): one row per reader and record, which
 * is both their favourites list and, counted, the record's public tally.
 *
 * SERVER ONLY.
 */

/**
 * Likes or unlikes. Idempotent either way. False when the record is not one
 * the OPAC shows: the id comes from the browser.
 */
export async function setLike(patronId: number, recordId: number, liked: boolean) {
  const visible = await prisma.bibliographicRecord.count({
    where: { id: recordId, status: { isRecordVisibleInOpac: true } },
  });
  if (!visible) return false;
  if (liked) {
    await prisma.recordLike.upsert({
      where: { patronId_recordId: { patronId, recordId } },
      update: {},
      create: { patronId, recordId },
    });
  } else {
    await prisma.recordLike.deleteMany({ where: { patronId, recordId } });
  }
  return true;
}

/** The reader's favourites, most recently liked first, for their account. */
export async function listLikedRecords(patronId: number) {
  const likes = await prisma.recordLike.findMany({
    // A record withdrawn from the OPAC since drops out of the list too.
    where: { patronId, record: { status: { isRecordVisibleInOpac: true } } },
    orderBy: { createdAt: "desc" },
    include: {
      record: {
        select: {
          id: true,
          title: true,
          contributions: {
            orderBy: [{ level: "asc" }, { rank: "asc" }],
            select: { author: { select: { name: true, forename: true } } },
          },
        },
      },
    },
  });
  return likes.map(({ record }) => ({
    id: record.id,
    title: record.title,
    authors: record.contributions.map(({ author }) =>
      [author.forename, author.name].filter(Boolean).join(" "),
    ),
  }));
}
