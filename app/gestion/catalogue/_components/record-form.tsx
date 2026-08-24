"use client";

import { useActionState } from "react";
import { fill, type Messages } from "@/lib/i18n";
import type { RecordInput } from "@/lib/cataloguing";
import { deleteRecordAction, saveRecordAction } from "../_actions";
import { RECORD_IDLE, type RecordFormState } from "../_lib/state";

const FIELD =
  "min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

const PRIMARY =
  "min-h-11 cluster items-center justify-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

type Option = { id: number; label: string };

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="stack gap-1.5">
      <span className="text-caption font-medium text-foreground-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-caption text-foreground-subtle">{hint}</span>
      ) : null}
      {error ? (
        <span className="text-caption text-danger">{error}</span>
      ) : null}
    </label>
  );
}

function Select({
  name,
  defaultValue,
  options,
  noneLabel,
}: {
  name: string;
  defaultValue: string;
  options: Option[];
  noneLabel: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={FIELD}>
      <option value="">{noneLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function RecordForm({
  id,
  values,
  documentTypes,
  recordStatuses,
  copyCount,
  messages,
}: {
  id: number | null;
  values: RecordInput;
  documentTypes: Option[];
  recordStatuses: Option[];
  copyCount: number;
  messages: Messages;
}) {
  const [state, formAction, pending] = useActionState(
    saveRecordAction,
    RECORD_IDLE,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteRecordAction,
    RECORD_IDLE,
  );
  const c = messages.cataloguing;

  const fieldError = (field: "title" | "publicationYear") =>
    state.kind === "invalid" && state.fields[field]
      ? c[state.fields[field]]
      : undefined;

  // React clears an uncontrolled form after a function action, so a rejected
  // submission comes back with its own values and a new key: remounting is
  // what makes `defaultValue` apply again.
  // `?? values` matters across a deploy: a tab open from before can still be
  // holding a state object of the previous shape, and reading `.title` off
  // undefined would blank the whole page instead of the one stale field.
  const shown = (state.kind === "invalid" ? state.values : values) ?? values;
  const formKey = state.kind === "invalid" ? `attempt-${state.attempt}` : "initial";

  const feedback = (result: RecordFormState) => {
    if (result.kind === "saved") return { tone: "text-success", text: c.saved };
    if (result.kind === "error") {
      return {
        tone: "text-danger",
        text: fill(c[result.key], { detail: result.detail ?? "" }),
      };
    }
    return null;
  };
  const message = feedback(state) ?? feedback(deleteState);

  return (
    <div className="stack gap-content">
      <form key={formKey} action={formAction} className="stack gap-content">
        {id === null ? null : <input type="hidden" name="id" value={id} />}

        <div className="grid gap-inline sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={c.fieldTitle} error={fieldError("title")}>
              <input
                name="title"
                defaultValue={shown.title}
                required
                autoFocus
                className={FIELD}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label={c.fieldSubtitle}>
              <input
                name="subtitle"
                defaultValue={shown.subtitle}
                className={FIELD}
              />
            </Field>
          </div>

          <Field label={c.fieldIsbn}>
            <input
              name="standardNumber"
              defaultValue={shown.standardNumber}
              className={`${FIELD} font-mono`}
            />
          </Field>

          <Field label={c.fieldYear} error={fieldError("publicationYear")}>
            <input
              name="publicationYear"
              defaultValue={shown.publicationYear}
              inputMode="numeric"
              className={FIELD}
            />
          </Field>

          <Field label={c.fieldDocumentType}>
            <Select
              name="documentTypeId"
              defaultValue={shown.documentTypeId}
              options={documentTypes}
              noneLabel={c.optionNone}
            />
          </Field>

          <Field label={c.fieldStatus}>
            <Select
              name="statusId"
              defaultValue={shown.statusId}
              options={recordStatuses}
              noneLabel={c.optionNone}
            />
          </Field>

          <Field label={c.fieldAuthors} hint={c.hintAuthorFormat}>
            <textarea
              name="authors"
              defaultValue={shown.authors}
              rows={3}
              className={`${FIELD} py-2`}
            />
          </Field>

          <Field label={c.fieldPublishers} hint={c.hintOnePerLine}>
            <textarea
              name="publishers"
              defaultValue={shown.publishers}
              rows={3}
              className={`${FIELD} py-2`}
            />
          </Field>

          <Field label={c.fieldSubjects} hint={c.hintOnePerLine}>
            <textarea
              name="subjects"
              defaultValue={shown.subjects}
              rows={3}
              className={`${FIELD} py-2`}
            />
          </Field>

          <Field label={c.fieldAbstract}>
            <textarea
              name="abstract"
              defaultValue={shown.abstract}
              rows={3}
              className={`${FIELD} py-2`}
            />
          </Field>
        </div>

        <div className="cluster gap-2">
          <button type="submit" className={PRIMARY} disabled={pending}>
            {c.save}
          </button>
        </div>
      </form>

      {message ? (
        <p aria-live="polite" className={`text-body-sm ${message.tone}`}>
          {message.text}
        </p>
      ) : null}

      {/* Sibling form: deleting must not carry the edits above with it. The
          refusal when copies exist is the whole safety net, so it is shown
          rather than the button being hidden. */}
      {id === null ? null : (
        <form action={deleteFormAction} className="border-t border-border pt-4">
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={deletePending}
            className="min-h-11 cluster items-center rounded-control border border-danger px-4 text-body-sm text-danger outline-offset-2 hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
          >
            {c.deleteRecord}
          </button>
          {copyCount > 0 ? (
            <span className="ml-3 text-caption text-foreground-muted">
              {fill(c.errHasCopies, { detail: String(copyCount) })}
            </span>
          ) : null}
        </form>
      )}
    </div>
  );
}
