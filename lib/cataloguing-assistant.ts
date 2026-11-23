import { prisma } from "./prisma";
import { askGemini, type AiAnswer, type AiSource } from "./ai";

/**
 * The cataloguing assistant (docs/18-author-enrichment.md): the free steps
 * first — Open Library by ISBN, the authorities by name — and Gemini only
 * for what they cannot give: a short biography with an identity check, and
 * a draft summary. Nothing here writes to the catalogue; the librarian's
 * save does (lib/cataloguing.ts).
 *
 * SERVER ONLY.
 */

const OPEN_LIBRARY = "https://openlibrary.org";
const HEADERS = { "User-Agent": "pmb-next-cataloguing/1.0" };

/** Lower case, accents and punctuation gone, words in a sorted bag. */
export function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const nameKey = (text: string) => fold(text).split(" ").filter(Boolean).sort().join(" ");

/** `Surname, Forename` — the form the record form and the authorities use. */
function splitName(entry: string) {
  const [name, ...rest] = entry.split(",");
  return { name: name.trim(), forename: rest.join(",").trim() || null };
}
const written = (name: string, forename: string | null) => (forename ? `${name}, ${forename}` : name);

async function openLibrary<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${OPEN_LIBRARY}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type OlEdition = { authors?: { key: string }[]; works?: { key: string }[]; publishers?: string[] };
type OlAuthor = {
  key: string;
  name?: string;
  personal_name?: string;
  birth_date?: string;
  death_date?: string;
  remote_ids?: { wikidata?: string; isni?: string };
};

export type OpenLibraryAuthor = {
  key: string;
  name: string;
  dates: string | null;
  wikidataId: string | null;
  isni: string | null;
};

const isbnOf = (value: string) => value.replace(/[^0-9Xx]/g, "");

async function editionByIsbn(isbn: string) {
  const digits = isbnOf(isbn);
  if (digits.length !== 10 && digits.length !== 13) return null;
  return openLibrary<OlEdition>(`/isbn/${digits}.json`);
}

/**
 * The edition's authors with their identifiers. Free; empty when unknown.
 * Open Library often files the authors on the work rather than on the
 * edition, so the work is asked when the edition names none.
 */
async function authorsByIsbn(isbn: string): Promise<OpenLibraryAuthor[]> {
  const edition = await editionByIsbn(isbn);
  let keys = (edition?.authors ?? []).map((author) => author.key);
  const workKey = edition?.works?.[0]?.key;
  if (keys.length === 0 && workKey) {
    const work = await openLibrary<{ authors?: { author?: { key?: string } }[] }>(`${workKey}.json`);
    keys = (work?.authors ?? []).map((entry) => entry.author?.key ?? "").filter(Boolean);
  }
  keys = keys.slice(0, 6);
  const authors = await Promise.all(keys.map((key) => openLibrary<OlAuthor>(`${key}.json`)));
  return authors
    .filter((author): author is OlAuthor => author !== null)
    .map((author) => {
      const years = [author.birth_date, author.death_date].map((d) => /\d{4}/.exec(d ?? "")?.[0] ?? "");
      return {
        key: author.key.replace("/authors/", ""),
        name: author.name ?? author.personal_name ?? "",
        dates: years[0] ? `${years[0]}-${years[1]}` : null,
        wikidataId: author.remote_ids?.wikidata ?? null,
        isni: author.remote_ids?.isni?.replace(/\s/g, "") ?? null,
      };
    })
    .filter((author) => author.name);
}

/** "Albert Camus" → "Camus, Albert": the last word taken as the surname. */
function asHeading(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return name.trim();
  return `${words[words.length - 1]}, ${words.slice(0, -1).join(" ")}`;
}

export type AuthorCandidate = {
  id: number;
  written: string;
  dates: string | null;
  hasBiography: boolean;
  titles: string[];
  titleCount: number;
  /** identifier: certain; name: same words; surname: same surname only. */
  strength: "identifier" | "name" | "surname";
};

export type AuthorCheck = {
  /** The line as typed in the form. */
  line: string;
  openLibrary: OpenLibraryAuthor | null;
  candidates: AuthorCandidate[];
};

const candidateShape = {
  id: true,
  name: true,
  forename: true,
  dates: true,
  comment: true,
  openLibraryKey: true,
  wikidataId: true,
  isni: true,
  _count: { select: { contributions: true } },
  contributions: {
    take: 3,
    orderBy: { record: { publicationYear: "desc" } },
    select: { record: { select: { title: true } } },
  },
} as const;

/**
 * Steps 1 and 2, both free. For each typed author: the Open Library author
 * of this ISBN that matches it (for its identifiers), and the authorities it
 * may be — by identifier first, then by the same words, then by surname.
 * When the field is still empty, the ISBN's authors are suggested instead.
 */
export async function checkAuthors(lines: string[], isbn: string) {
  const fromIsbn = await authorsByIsbn(isbn);
  const suggestions = lines.length === 0 ? fromIsbn.map((author) => asHeading(author.name)) : [];
  const typed = lines.length > 0 ? lines : suggestions;

  const checks: AuthorCheck[] = [];
  for (const line of typed) {
    const { name, forename } = splitName(line);
    const key = nameKey(`${name} ${forename ?? ""}`);
    const surname = fold(name);
    const openLibrary =
      fromIsbn.find((author) => nameKey(author.name) === key) ??
      fromIsbn.find((author) => fold(author.name).split(" ").includes(surname)) ??
      null;

    const identifiers = [
      openLibrary?.key ? { openLibraryKey: openLibrary.key } : null,
      openLibrary?.wikidataId ? { wikidataId: openLibrary.wikidataId } : null,
      openLibrary?.isni ? { isni: openLibrary.isni } : null,
    ].filter((clause) => clause !== null);

    // Surname folded the way the database folds it, accents included.
    const bySurname = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM authors WHERE unaccent(lower(name)) = unaccent(lower(${name})) LIMIT 8
    `;
    const rows = await prisma.author.findMany({
      where: {
        OR: [...identifiers, { id: { in: bySurname.map((row) => row.id) } }],
      },
      select: candidateShape,
    });

    const candidates = rows
      .map((row): AuthorCandidate => {
        const byIdentifier =
          (openLibrary?.key && row.openLibraryKey === openLibrary.key) ||
          (openLibrary?.wikidataId && row.wikidataId === openLibrary.wikidataId) ||
          (openLibrary?.isni && row.isni === openLibrary.isni);
        return {
          id: row.id,
          written: written(row.name, row.forename),
          dates: row.dates,
          hasBiography: Boolean(row.comment?.trim()),
          titles: row.contributions.map((c) => c.record.title),
          titleCount: row._count.contributions,
          strength: byIdentifier
            ? "identifier"
            : nameKey(`${row.name} ${row.forename ?? ""}`) === key
              ? "name"
              : "surname",
        };
      })
      .sort((a, b) => ["identifier", "name", "surname"].indexOf(a.strength) - ["identifier", "name", "surname"].indexOf(b.strength));

    checks.push({ line, openLibrary, candidates });
  }
  return { checks, suggestions };
}

export type BiographyDraft = {
  samePerson: "oui" | "non" | "incertain";
  reason: string;
  dates: string;
  biography: string;
  sources: AiSource[];
};

/** Gemini wraps JSON in a code fence more often than not. */
function parseJson(text: string): Record<string, unknown> | null {
  const body = /\{[\s\S]*\}/.exec(text)?.[0];
  if (!body) return null;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Step 3: one grounded request for a short biography and an identity check
 * resting on the titles — a homonym fails it where a name alone cannot.
 */
export async function draftBiography(
  {
    author,
    book,
    otherTitles,
  }: { author: string; book: { title: string; year: string; publisher: string }; otherTitles: string[] },
  staffUserId: number | null,
): Promise<{ answer: AiAnswer; draft: BiographyDraft | null }> {
  const bookLine = [book.title && `« ${book.title} »`, book.publisher, book.year].filter(Boolean).join(", ");
  const prompt = [
    "Tu aides la documentaliste d'un CDI d'école (élèves de 10 à 18 ans) à cataloguer un livre.",
    `Auteur à identifier : ${author}.`,
    bookLine ? `Livre catalogué : ${bookLine}.` : "",
    otherTitles.length ? `Autres livres de cet auteur déjà au CDI : ${otherTitles.join(" ; ")}.` : "",
    "Vérifie avec la recherche que l'auteur de ce livre est bien la personne que tu décris (attention aux homonymes).",
    "Réponds uniquement par un objet JSON :",
    '{"meme_personne":"oui|non|incertain","raison":"une phrase","dates":"AAAA-AAAA, ou AAAA- si vivant, ou vide","biographie":"2 ou 3 phrases simples en français"}',
    "La biographie ne contient que des faits publics et professionnels (œuvres, prix, nationalité, métier), rien sur la vie privée.",
    "Si tu n'es pas sûr de l'identité, mets meme_personne à incertain et laisse la biographie vide.",
  ]
    .filter(Boolean)
    .join("\n");

  const answer = await askGemini({
    kind: "biography",
    input: { author: fold(author), book: fold(bookLine), otherTitles: otherTitles.map(fold) },
    prompt,
    grounded: true,
    staffUserId,
  });
  if (!answer.ok) return { answer, draft: null };

  const json = parseJson(answer.text);
  const samePerson = ["oui", "non", "incertain"].includes(String(json?.meme_personne))
    ? (String(json?.meme_personne) as BiographyDraft["samePerson"])
    : "incertain";
  const draft = json
    ? {
        samePerson,
        reason: String(json.raison ?? ""),
        dates: String(json.dates ?? "").slice(0, 20),
        biography: String(json.biographie ?? "").slice(0, 1200),
        sources: answer.sources.slice(0, 5),
      }
    : null;
  return { answer, draft };
}

/**
 * The "Proposer un résumé" helper. With the Open Library description (free)
 * the model only rewrites it, and a plain request is enough. Without one it
 * would write from memory, and in testing it invented a character and a
 * town for a well-known novel — so then, and only then, the request is
 * grounded in a web search, the costlier kind. "INCONNU" when it still is
 * not sure: better no draft than a wrong one.
 */
export async function draftAbstract(
  { title, authors, isbn, year }: { title: string; authors: string[]; isbn: string; year: string },
  staffUserId: number | null,
): Promise<{ answer: AiAnswer; abstract: string | null }> {
  const edition = await editionByIsbn(isbn);
  const workKey = edition?.works?.[0]?.key;
  const work = workKey ? await openLibrary<{ description?: string | { value?: string } }>(`${workKey}.json`) : null;
  const description = typeof work?.description === "string" ? work.description : (work?.description?.value ?? "");

  const prompt = [
    "Tu aides la documentaliste d'un CDI d'école (élèves de 10 à 18 ans).",
    `Rédige le résumé du livre « ${title} »${authors.length ? ` de ${authors.join(", ")}` : ""}${year ? ` (${year})` : ""}.`,
    description ? `Description de l'éditeur, à reformuler sans la copier :\n${description.slice(0, 1500)}` : "",
    description ? "" : "Vérifie l'intrigue avec la recherche avant d'écrire.",
    "3 à 5 phrases simples, en français, sans révéler la fin.",
    "N'écris aucun nom de personnage ni de lieu dont tu n'es pas certain.",
    "Si tu n'es pas sûr de connaître ce livre, réponds exactement : INCONNU.",
    "Réponds par le résumé seul.",
  ]
    .filter(Boolean)
    .join("\n");

  const answer = await askGemini({
    kind: "abstract",
    // `v` changes with the prompt, so an answer to an older prompt is not reused.
    input: { v: 2, title: fold(title), authors: authors.map(fold), isbn: isbnOf(isbn), year },
    prompt,
    grounded: !description,
    staffUserId,
  });
  if (!answer.ok) return { answer, abstract: null };
  const text = answer.text.trim();
  return { answer, abstract: /^INCONNU\.?$/i.test(text) ? null : text.slice(0, 2000) };
}

/**
 * "Traduire en anglais (IA)": the French abstract, as the librarian has it
 * in the form, into English for the OPAC in English. The cheapest kind of
 * request — no search, the whole text given — and cached on the text, so
 * translating the same abstract twice costs once. Longer answers allowed
 * than for a draft (900 tokens), since an abstract can run to two
 * paragraphs.
 */
export async function translateAbstract(
  french: string,
  staffUserId: number | null,
): Promise<{ answer: AiAnswer; english: string | null }> {
  const prompt = [
    "Translate this French summary of a book from a school library (readers aged 10 to 18) into English.",
    "Keep the meaning, the paragraphs and the plain style. Keep proper names as they are, but use the usual English names of well-known characters and works.",
    "Reply with the translation only.",
    "",
    french,
  ].join("\n");
  const answer = await askGemini({
    kind: "translation",
    input: { v: 1, text: french.trim() },
    prompt,
    grounded: false,
    staffUserId,
    maxTokens: 900,
  });
  if (!answer.ok) return { answer, english: null };
  return { answer, english: answer.text.trim().slice(0, 3000) || null };
}
