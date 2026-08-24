"use client";

import { useActionState } from "react";
import { fill, type Messages } from "@/lib/i18n";
import { deleteItemAction, saveItemAction } from "../_actions";
import { ITEM_IDLE, type ItemFormState } from "../_lib/state";

const FIELD =
  "min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

const BUTTON =
  "min-h-11 cluster items-center justify-center rounded-control border border-border px-3 text-caption outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

type Option = { id: number; label: string };

export type CopyRow = {
  id: number;
  barcode: string;
  callNumber: string;
  locationId: string;
  sectionId: string;
  statusId: string;
  isOnLoan: boolean;
};

function Feedback({ state, messages }: { state: ItemFormState; messages: Messages }) {
  const c = messages.cataloguing;
  if (state.kind === "idle") return null;
  const text =
    state.kind === "saved"
      ? c.copySaved
      : state.kind === "deleted"
        ? c.copyDeleted
        : fill(c[state.key], { detail: state.detail ?? "" });

  return (
    <p
      aria-live="polite"
      className={`text-caption ${state.kind === "error" ? "text-danger" : "text-success"}`}
    >
      {text}
    </p>
  );
}

/**
 * One row per copy plus a blank row to add another. Each row is its own form,
 * so saving one copy never touches the others — legacy submitted the whole
 * record and its copies together.
 */
function CopyForm({
  recordId,
  copy,
  locations,
  sections,
  itemStatuses,
  messages,
}: {
  recordId: number;
  copy: CopyRow | null;
  locations: Option[];
  sections: Option[];
  itemStatuses: Option[];
  messages: Messages;
}) {
  const [saveState, save, savePending] = useActionState(saveItemAction, ITEM_IDLE);
  const [deleteState, remove, deletePending] = useActionState(
    deleteItemAction,
    ITEM_IDLE,
  );
  const c = messages.cataloguing;
  const state = saveState.kind !== "idle" ? saveState : deleteState;

  // Same reset behaviour as the record form: a rejected save comes back with
  // its own values and a fresh key so nothing typed is lost.
  const rejected = saveState.kind === "error" ? saveState.values : undefined;
  const shown = rejected ?? copy ?? null;
  const formKey =
    saveState.kind === "error" ? `attempt-${saveState.attempt ?? 0}` : "initial";

  return (
    <div className="stack gap-inline rounded-card border border-border p-3">
      <form key={formKey} action={save} className="grid gap-inline sm:grid-cols-5">
        <input type="hidden" name="recordId" value={recordId} />
        {copy ? <input type="hidden" name="itemId" value={copy.id} /> : null}

        <label className="stack gap-1">
          <span className="text-caption text-foreground-muted">
            {c.fieldBarcode}
          </span>
          <input
            name="barcode"
            defaultValue={shown?.barcode ?? ""}
            required
            className={`${FIELD} font-mono`}
          />
        </label>

        <label className="stack gap-1">
          <span className="text-caption text-foreground-muted">
            {c.fieldCallNumber}
          </span>
          <input
            name="callNumber"
            defaultValue={shown?.callNumber ?? ""}
            className={`${FIELD} font-mono`}
          />
        </label>

        <label className="stack gap-1">
          <span className="text-caption text-foreground-muted">
            {c.fieldLocation}
          </span>
          <select
            name="locationId"
            defaultValue={shown?.locationId ?? ""}
            className={FIELD}
          >
            <option value="">{c.optionNone}</option>
            {locations.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="stack gap-1">
          <span className="text-caption text-foreground-muted">
            {c.fieldSection}
          </span>
          <select
            name="sectionId"
            defaultValue={shown?.sectionId ?? ""}
            className={FIELD}
          >
            <option value="">{c.optionNone}</option>
            {sections.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="stack gap-1">
          <span className="text-caption text-foreground-muted">
            {c.fieldItemStatus}
          </span>
          <select
            name="statusId"
            defaultValue={shown?.statusId ?? ""}
            className={FIELD}
          >
            <option value="">{c.optionNone}</option>
            {itemStatuses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="cluster gap-2 sm:col-span-5">
          <button type="submit" className={BUTTON} disabled={savePending}>
            {copy ? c.saveCopy : c.addCopy}
          </button>
          {copy?.isOnLoan ? (
            <span className="text-caption text-warning">{c.onLoanFlag}</span>
          ) : null}
        </div>
      </form>

      {copy ? (
        <form action={remove}>
          <input type="hidden" name="itemId" value={copy.id} />
          <input type="hidden" name="recordId" value={recordId} />
          <button
            type="submit"
            disabled={deletePending}
            className="min-h-11 cluster items-center rounded-control px-3 text-caption text-danger outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
          >
            {c.deleteCopy}
          </button>
        </form>
      ) : null}

      <Feedback state={state} messages={messages} />
    </div>
  );
}

export function CopiesEditor({
  recordId,
  copies,
  locations,
  sections,
  itemStatuses,
  messages,
}: {
  recordId: number;
  copies: CopyRow[];
  locations: Option[];
  sections: Option[];
  itemStatuses: Option[];
  messages: Messages;
}) {
  const c = messages.cataloguing;

  return (
    <div className="stack gap-inline">
      {copies.length === 0 ? (
        <p className="text-body-sm text-foreground-muted">{c.noCopies}</p>
      ) : null}

      {copies.map((copy) => (
        <CopyForm
          key={copy.id}
          recordId={recordId}
          copy={copy}
          locations={locations}
          sections={sections}
          itemStatuses={itemStatuses}
          messages={messages}
        />
      ))}

      {/* A stable key. Keying this on the copy count remounted the form the
          moment a copy was added — revalidation grows the list — which threw
          away the very "copy saved" message the add had just produced. React
          clears the fields after the action anyway. */}
      <CopyForm
        key="new"
        recordId={recordId}
        copy={null}
        locations={locations}
        sections={sections}
        itemStatuses={itemStatuses}
        messages={messages}
      />
    </div>
  );
}
