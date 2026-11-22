"use client";

import { useRef, useState, useTransition } from "react";
import { BadgeCheck, ExternalLink, Search, Sparkles } from "lucide-react";
import type { AuthorChoice } from "@/lib/cataloguing";
import type { AuthorCheck } from "@/lib/cataloguing-assistant";
import { fill, type Messages } from "@/lib/i18n";
import { checkAuthorsAction, draftBiographyAction } from "../_actions";
import type { AssistantUsage, AuthorCheckState, BiographyDraftState } from "../_lib/state";

const BUTTON =
  "min-h-11 cluster items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-body-sm font-medium outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

/** Reads a field of the record form this panel sits in. */
function field(panel: HTMLElement | null, name: string) {
  const element = panel?.closest("form")?.elements.namedItem(name);
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element : null;
}

/** What each answer to "who is this author?" becomes on save. */
type Selection = { target: number | "new" | null; kept: { biography: string; dates: string } | null };

export function UsageLine({ usage, messages }: { usage: AssistantUsage; messages: Messages }) {
  if (!usage.enabled) return null;
  return (
    <p className="text-caption text-foreground-muted">
      {fill(messages.cataloguing.aiUsage, { used: String(usage.used), limit: String(usage.limit) })}
    </p>
  );
}

export function aiMessage(state: { kind: string; reason?: string; usage: AssistantUsage }, messages: Messages) {
  const c = messages.cataloguing;
  if (state.kind !== "error") return null;
  if (state.reason === "DAILY_LIMIT") return fill(c.aiLimit, { limit: String(state.usage.limit) });
  if (state.reason === "NOT_CONFIGURED") return c.aiNotConfigured;
  return c.aiFailed;
}

/**
 * The cataloguing assistant for authors (docs/18-author-enrichment.md).
 *
 * "Vérifier les auteurs" is free: Open Library by ISBN and the authorities
 * by name. For each author the librarian answers "C'est lui" or "Nouvel
 * auteur". Only then, and only for an author without a biography, may they
 * ask Gemini for one — a paid request, hence a button of its own and the
 * day's count beside it. What they keep travels in a hidden field and is
 * filed on the authority when the record is saved; nothing is written
 * before.
 */
export function AuthorAssistant({ initialUsage, messages }: { initialUsage: AssistantUsage; messages: Messages }) {
  const c = messages.cataloguing;
  const panel = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState<AuthorCheckState | null>(null);
  const [usage, setUsage] = useState(initialUsage);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [drafts, setDrafts] = useState<Record<string, BiographyDraftState | "pending">>({});
  const [checking, startChecking] = useTransition();

  const check = (authors?: string) =>
    startChecking(async () => {
      const authorsField = field(panel.current, "authors");
      if (authors !== undefined && authorsField) authorsField.value = authors;
      const result = await checkAuthorsAction(authorsField?.value ?? "", field(panel.current, "standardNumber")?.value ?? "");
      setChecked(result);
      setUsage(result.usage);
      setDrafts({});
      // A certain or same-name match is preselected; a same-surname one is
      // more often a relative or a namesake, so those start as new authors.
      setSelections(
        Object.fromEntries(
          result.checks.map((item) => {
            const best = item.candidates[0];
            const target = best && best.strength !== "surname" ? best.id : "new";
            return [item.line, { target, kept: null }];
          }),
        ),
      );
    });

  const select = (line: string, target: Selection["target"]) =>
    setSelections((current) => ({ ...current, [line]: { target, kept: null } }));

  const askBiography = async (item: AuthorCheck, otherTitles: string[]) => {
    setDrafts((current) => ({ ...current, [item.line]: "pending" }));
    const result = await draftBiographyAction({
      author: item.line,
      title: field(panel.current, "title")?.value ?? "",
      year: field(panel.current, "publicationYear")?.value ?? "",
      publisher: (field(panel.current, "publishers")?.value ?? "").split("\n")[0]?.trim() ?? "",
      otherTitles,
    });
    setUsage(result.usage);
    setDrafts((current) => ({ ...current, [item.line]: result }));
  };

  const choices: Record<string, AuthorChoice> = {};
  for (const item of checked?.checks ?? []) {
    const selection = selections[item.line];
    if (!selection?.target) continue;
    choices[item.line] = {
      ...(selection.target === "new" ? { isNew: true } : { id: selection.target }),
      ...(selection.kept ?? {}),
      // The ISBN's own author: its identifiers belong to whoever it is filed as.
      ...(item.openLibrary
        ? {
            openLibraryKey: item.openLibrary.key,
            wikidataId: item.openLibrary.wikidataId ?? undefined,
            isni: item.openLibrary.isni ?? undefined,
          }
        : {}),
    };
  }

  return (
    <div ref={panel} className="stack gap-3 rounded-card border border-border bg-surface-muted p-3">
      <input type="hidden" name="authorChoices" value={JSON.stringify(choices)} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={BUTTON} disabled={checking} onClick={() => check()}>
          <Search aria-hidden="true" className="size-4" />
          {checking ? c.checking : c.checkAuthors}
        </button>
        <span className="text-caption text-foreground-muted">{c.checkAuthorsHint}</span>
      </div>

      {checked && checked.checks.length === 0 ? (
        <p className="text-body-sm text-foreground-muted">{c.nothingToCheck}</p>
      ) : null}

      {checked && checked.suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-body-sm">
          <span>{c.suggestedAuthors}</span>
          <strong>{checked.suggestions.join(" ; ")}</strong>
          <button type="button" className={BUTTON} onClick={() => check(checked.suggestions.join("\n"))}>
            {c.useSuggested}
          </button>
        </div>
      ) : null}

      {(checked?.checks ?? []).map((item, index) => {
        const selection = selections[item.line] ?? { target: null, kept: null };
        const chosen = item.candidates.find((candidate) => candidate.id === selection.target);
        const needsBiography = selection.target === "new" || (chosen !== undefined && !chosen.hasBiography);
        const draft = drafts[item.line];
        const group = `author-choice-${index}`;
        return (
          <fieldset key={item.line} className="stack gap-2 rounded-card border border-border bg-surface p-3">
            <legend className="px-1 font-semibold">{item.line}</legend>
            {item.openLibrary ? (
              <p className="text-caption text-foreground-muted">
                Open Library : {item.openLibrary.name}
                {item.openLibrary.dates ? ` (${item.openLibrary.dates})` : ""}
              </p>
            ) : null}

            {item.candidates.map((candidate) => (
              <label key={candidate.id} className="flex items-start gap-2 text-body-sm">
                <input
                  type="radio"
                  name={group}
                  checked={selection.target === candidate.id}
                  onChange={() => select(item.line, candidate.id)}
                  className="mt-1 size-4 accent-accent"
                />
                <span className="stack">
                  <span>
                    <strong>{c.thisIsThem}</strong> — {candidate.written}
                    {candidate.dates ? ` (${candidate.dates})` : ""}{" "}
                    <span className="inline-flex items-center gap-1 rounded-control bg-surface-muted px-1.5 text-caption">
                      {candidate.strength === "identifier" ? <BadgeCheck aria-hidden="true" className="size-3.5 text-accent" /> : null}
                      {candidate.strength === "identifier" ? c.matchIdentifier : candidate.strength === "name" ? c.matchName : c.matchSurname}
                    </span>
                  </span>
                  <span className="text-caption text-foreground-muted">
                    {fill(c.titlesInCdi, { count: String(candidate.titleCount) })}
                    {candidate.titles.length ? ` : ${candidate.titles.join(", ")}` : ""} ·{" "}
                    {candidate.hasBiography ? c.hasBiography : c.noBiography}
                  </span>
                </span>
              </label>
            ))}
            <label className="flex items-start gap-2 text-body-sm">
              <input
                type="radio"
                name={group}
                checked={selection.target === "new"}
                onChange={() => select(item.line, "new")}
                className="mt-1 size-4 accent-accent"
              />
              <span>
                <strong>{c.newAuthor}</strong>
                {item.candidates.length === 0 ? <span className="text-foreground-muted"> — {c.noCandidate}</span> : null}
              </span>
            </label>

            {needsBiography && usage.enabled ? (
              <div className="stack gap-2 border-t border-border pt-2">
                {selection.kept ? (
                  <p role="status" className="text-body-sm text-success">
                    {c.biographyKept}
                  </p>
                ) : draft === undefined || draft === "pending" ? (
                  <button
                    type="button"
                    className={`${BUTTON} w-fit`}
                    disabled={draft === "pending"}
                    onClick={() => askBiography(item, chosen?.titles ?? [])}
                  >
                    <Sparkles aria-hidden="true" className="size-4 text-accent" />
                    {draft === "pending" ? c.aiWorking : c.proposeBiography}
                  </button>
                ) : draft.kind === "error" ? (
                  <p role="alert" className="text-body-sm text-danger">
                    {aiMessage(draft, messages)}
                  </p>
                ) : (
                  <BiographyReview
                    key={item.line}
                    draft={draft}
                    messages={messages}
                    onKeep={(kept) => setSelections((current) => ({ ...current, [item.line]: { ...selection, kept } }))}
                    onDiscard={() =>
                      setDrafts((current) => {
                        const next = { ...current };
                        delete next[item.line];
                        return next;
                      })
                    }
                  />
                )}
              </div>
            ) : null}
          </fieldset>
        );
      })}

      {checked ? <UsageLine usage={usage} messages={messages} /> : null}
    </div>
  );
}

/** Step 4: the librarian reads, edits and keeps — or discards. */
function BiographyReview({
  draft,
  messages,
  onKeep,
  onDiscard,
}: {
  draft: Extract<BiographyDraftState, { kind: "draft" }>;
  messages: Messages;
  onKeep: (kept: { biography: string; dates: string }) => void;
  onDiscard: () => void;
}) {
  const c = messages.cataloguing;
  const [biography, setBiography] = useState(draft.draft.biography);
  const [dates, setDates] = useState(draft.draft.dates);
  const verdict = {
    oui: { text: c.samePersonYes, tone: "text-success" },
    non: { text: c.samePersonNo, tone: "text-danger" },
    incertain: { text: c.samePersonUnsure, tone: "text-foreground" },
  }[draft.draft.samePerson];

  return (
    <div className="stack gap-2">
      <p className={`text-body-sm font-semibold ${verdict.tone}`}>
        {verdict.text}
        {draft.draft.reason ? <span className="font-normal text-foreground-muted"> {draft.draft.reason}</span> : null}
      </p>
      {draft.cached ? <p className="text-caption text-foreground-muted">{c.aiCached}</p> : null}
      <label className="stack gap-1">
        <span className="text-caption font-medium text-foreground-muted">{c.biographyDraft}</span>
        <textarea
          value={biography}
          onChange={(event) => setBiography(event.target.value)}
          rows={4}
          className="w-full rounded-control border border-border bg-background px-3 py-2 text-body-sm"
        />
      </label>
      <label className="stack w-40 gap-1">
        <span className="text-caption font-medium text-foreground-muted">{c.datesLabel}</span>
        <input
          value={dates}
          onChange={(event) => setDates(event.target.value)}
          className="min-h-11 rounded-control border border-border bg-background px-3 text-body-sm"
        />
      </label>
      {draft.draft.sources.length > 0 ? (
        <div className="text-caption">
          <span className="font-medium text-foreground-muted">{c.sources} :</span>{" "}
          {draft.draft.sources.map((source) => (
            <a
              key={source.uri}
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-3 inline-flex items-center gap-1 text-accent underline underline-offset-2"
            >
              {source.title || source.uri}
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          ))}
        </div>
      ) : null}
      <p className="text-caption text-foreground-muted">{c.reviewNote}</p>
      <div className="cluster gap-2">
        <button
          type="button"
          disabled={!biography.trim()}
          onClick={() => onKeep({ biography: biography.trim(), dates: dates.trim() })}
          className="min-h-11 rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        >
          {c.keepBiography}
        </button>
        <button type="button" onClick={onDiscard} className={BUTTON}>
          {c.discard}
        </button>
      </div>
    </div>
  );
}
