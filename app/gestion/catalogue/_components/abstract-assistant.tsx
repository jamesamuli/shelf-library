"use client";

import { useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { Messages } from "@/lib/i18n";
import { draftAbstractAction } from "../_actions";
import type { AbstractDraftState, AssistantUsage } from "../_lib/state";
import { UsageLine, aiMessage } from "./author-assistant";

/**
 * "Proposer un résumé (IA)", under the summary field: one paid request (or a
 * cached answer), from the title, authors, ISBN and year typed above, and
 * the Open Library description when there is one. The draft goes into the
 * field for the librarian to read and edit; replacing a summary already
 * typed asks first. Saving the record is what publishes it.
 */
export function AbstractAssistant({ initialUsage, messages }: { initialUsage: AssistantUsage; messages: Messages }) {
  const c = messages.cataloguing;
  const panel = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<AbstractDraftState | null>(null);
  const [pending, startTransition] = useTransition();
  if (!initialUsage.enabled) return null;

  const read = (name: string) => {
    const element = panel.current?.closest("form")?.elements.namedItem(name);
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element : null;
  };

  const propose = () =>
    startTransition(async () => {
      const state = await draftAbstractAction({
        title: read("title")?.value ?? "",
        authors: read("authors")?.value ?? "",
        isbn: read("standardNumber")?.value ?? "",
        year: read("publicationYear")?.value ?? "",
      });
      setResult(state);
      const field = read("abstract");
      if (state.kind === "draft" && field) {
        if (!field.value.trim() || window.confirm(c.abstractReplace)) field.value = state.abstract;
      }
    });

  const message =
    result === null
      ? null
      : result.kind === "draft"
        ? { tone: "text-success", text: `${c.abstractFilled}${result.cached ? ` ${c.aiCached}` : ""}` }
        : result.kind === "unknown"
          ? { tone: "text-foreground-muted", text: c.abstractUnknown }
          : { tone: "text-danger", text: aiMessage(result, messages) };

  return (
    <div ref={panel} className="stack gap-1.5">
      <button
        type="button"
        onClick={propose}
        disabled={pending}
        className="min-h-11 w-fit cluster items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-body-sm font-medium outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
      >
        <Sparkles aria-hidden="true" className="size-4 text-accent" />
        {pending ? c.aiWorking : c.proposeAbstract}
      </button>
      {message ? (
        <p role="status" className={`text-caption ${message.tone}`}>
          {message.text}
        </p>
      ) : null}
      <UsageLine usage={result?.usage ?? initialUsage} messages={messages} />
    </div>
  );
}
