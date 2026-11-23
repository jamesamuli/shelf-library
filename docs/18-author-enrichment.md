# Cataloguing assistant — authors and summaries

Status: **design approved by the CDI on 2026-11-22**, with one standing
condition: *Gemini's use must be measured, to keep the bill low.* That
condition shapes every step below. The "Proposer un résumé" helper, parked
on 2026-11-20, is built with it: same key, same moment, same cost rules.

## What the CDI asked

When a book is added, its authors are loaded with it. The app checks
whether each one is already in the catalogue. For a new author, or one
without a biography, Gemini looks one up and checks it is the same person.
A separate biography editor is not wanted.

## Where we start

- The Gestion record form takes authors as text lines, "Nom, Prénom".
  `resolveAuthors()` (lib/cataloguing.ts) finds an author by **exact**
  name + forename, or creates one. So "Rowling, J.K." and "Rowling, J. K."
  become two authors, and two real people who share a name become one.
- **The form does not look a book up by ISBN.** The earlier study assumed
  it did. Step 1 adds that lookup, for the authors only.
- `authors` has `dates`, `isni`, `website` and `comment` (the biography,
  legacy `author_comment`). Nothing fills them at cataloguing.
- Legacy PMB had the same authority record, typed by hand.

## The four steps (approved)

1. **ISBN → identifiers (free).** "Vérifier les auteurs" asks Open Library
   for the edition. It returns its authors with their Open Library key and,
   when known, Wikidata and ISNI ids. An author already holding one of
   those ids is a **certain** match.
2. **Candidates by name (free).** Each typed name is compared with the
   authorities after folding accents, case, punctuation and order
   ("J.K. Rowling" = "Rowling, J. K."); a same-surname author is offered as
   a weaker candidate.
   - The librarian sees each candidate with dates, titles already in the
     CDI and whether it has a biography.
   - The answer is **"C'est lui"** (the record links to that author, even
     if spelt differently) or **"Nouvel auteur"** (a new authority, even
     if a homonym exists).
3. **Gemini, only on request.** For a new author or one without a
   biography, "Proposer une biographie (IA)" makes one grounded request.
   - It sends the name, the book being catalogued and the candidate's
     other titles in the CDI.
   - It gets back: same person (yes / no / unsure) with a reason, dates, and
     2–3 plain sentences for readers aged 10 to 18. Public, professional
     facts only.
   - It also gets the web sources the answer rests on.
4. **The librarian decides.** The draft is editable, its sources are shown,
   and nothing is written until the record is saved.
   - Saving files the biography, dates and identifiers on the authority,
     never replacing a biography already there.

"Proposer un résumé (IA)" works the same way:
- On request, from the title, authors and the Open Library description
  when one exists (fetched free).
- No web grounding, which is the costlier option.
- It answers "unknown" rather than invent, and fills the field as a draft.

## Keeping the cost down

| Rule | Effect |
| --- | --- |
| **Only on a click** | Nothing calls Gemini while typing, on load or on save. |
| **Free steps first** | Open Library and the catalogue answer "is it the same author?" without Gemini. An author that already has a biography never triggers a request. |
| **Cache** | Every answer is kept (`ai_requests`) and reused for 90 days for the same question. Asking twice costs once. |
| **Daily cap** | `GEMINI_DAILY_LIMIT` (default 30) paid requests a day, across all staff. Past it, the buttons answer "limite du jour atteinte" until midnight UTC. Cached answers do not count. |
| **Cheapest adequate model** | `GEMINI_MODEL`, default `gemini-3.5-flash-lite`: a test grounded request used 161 tokens. |
| **Short answers** | `maxOutputTokens` 400, low temperature. |
| **Grounding only where it pays** | The identity check needs the web; the summary does not. |
| **Visible** | The assistant shows "n / 30 aujourd'hui", and each request is logged with its tokens. |
| **Staff only** | Behind `catalog.edit`; readers never reach it. |

Add a budget alert in Google Cloud (Billing → Budgets & alerts) as a
backstop. It is the only control that also covers a leaked key.

## Risks

| Risk | Handling |
| --- | --- |
| Invented facts | Grounding with shown sources, 2–3 sentences, "unsure" allowed, the librarian's check. |
| Homonyms (Morris, Dumont…) | Identifiers first; the identity check by titles; the librarian picks. |
| Living people's privacy | Public, professional facts only, by instruction. |
| Readers are children | Age-appropriate wording by instruction; every text is read before it is published. |
| Pupils' data | Nothing about readers is sent: only book and author metadata. |
| Service down / key missing | The form works as before; the AI buttons hide without `GEMINI_API_KEY`. |

## Data

Migration `20261122120000_cataloguing_assistant`:
- `authors.openlibrary_key` and `authors.wikidata_id`, both nullable and
  unique. `isni` already exists.
- The `ai_requests` table records each paid request and its cached answer.

## Built (2026-11-22)

| Where | What |
| --- | --- |
| `lib/ai.ts` | The one door to Gemini. It enforces every cost rule above (cache, daily cap, model, short answers, logging), so no caller can skip one. |
| `lib/cataloguing-assistant.ts` | Open Library by ISBN (falling back to the work's authors, where Open Library often files them); candidates by identifier, name and surname; the biography and summary drafts. |
| `lib/cataloguing.ts` | `resolveAuthors()` follows the librarian's choices: link "C'est lui" by id, create "Nouvel auteur" even beside a homonym. It files the kept biography, dates and identifiers, never over what is there. |
| `app/gestion/catalogue/_components/author-assistant.tsx`, `abstract-assistant.tsx` | The panels under "Auteurs" and "Résumé". |

**The summary's grounding, revised after a test.** Without a description
from Open Library, a plain request for *Meurtres pour mémoire* invented an
"inspecteur Bernard Cadinot" and set the story in Lyon. The summary is now
grounded in a web search **only** when Open Library has no description, and
the prompt forbids names it has not checked. The second draft was right,
and named no one it was unsure of. Cache keys carry a prompt version, so an
answer to an older prompt is never served again.

**Verified** in Edge, signed in as the demo administrator:
1. **Free steps.**
   - ISBN 9782070360024 with an empty field suggests "Camus, Albert" from
     Open Library.
   - He is matched by name, with his 2 books and his biography, so no AI
     button is shown.
   - "Rowling, J.K." is matched to "Rowling, J. K." and preselected.
2. **A new author** (Daeninckx):
   - "Proposer une biographie" makes one grounded request. The answer is
     "same person, author of *Meurtres pour mémoire* (1984)", with a
     correct 2-sentence biography and 5 sources.
   - Asking again is served from the cache ("Réponse déjà connue : aucun
     coût"), and the counter stays at 1 / 30.
3. **Saving** files the biography and "1949-" on the new authority.
4. **The summary**: see above.
5. **axe** is clean on the form with the panels open.

The whole test cost 3 paid requests: 371, 212 and about 300 tokens. The
test record and author were deleted afterwards.

**Left for later:**
- Applying the ISBN's other data (title, publisher, year) to the form.
- A Gestion screen for the AI log (`ai_requests`). For now, the count shows
  in the assistant.

## Step 5: the English abstract (2026-11-23)

The OPAC in English shows `abstract_en` where there is one (docs/10-catalogue.md §14).

**In the record form.** A "Résumé en anglais" field sits under the French
abstract, with **"Traduire le résumé (IA)"** beneath it.

**The request.**
- One ungrounded request (`translateAbstract`, kind `translation`). It is
  the cheapest kind, since the whole text is given.
- The answer cap is 900 tokens instead of 400, so two paragraphs fit
  (`askGemini`'s new `maxTokens`).
- It is cached on the French text, so the same abstract is never paid for
  twice.
- With no French abstract typed, the button says so and spends nothing.
- The answer fills the field for the librarian to read. Replacing an
  English abstract already typed asks first. Nothing is saved until the
  record is.

**Measured.** One test request ("La Peste", one sentence) answered in
English and the field was filled; the record was not saved.

**The demo data was not translated by Gemini.** The 104 abstracts in the
database were translated once by hand into `prisma/demo-abstracts-en.json`,
and `seed:demo` fills `abstract_en` where it is empty. This cost no
requests.
