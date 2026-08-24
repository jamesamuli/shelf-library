"use client";

import { useActionState } from "react";
import { fill, type Messages } from "@/lib/i18n";
import type { PatronFieldError, PatronField, PatronInput } from "@/lib/patrons";
import { createPatronAction } from "../_actions";
import { READER_IDLE } from "../_lib/state";

const FIELD =
  "min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

const PRIMARY =
  "min-h-11 cluster items-center justify-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

type Option = { id: number; label: string };

const MESSAGE_FOR: Record<PatronFieldError, keyof Messages["readers"]> = {
  REQUIRED: "errRequired",
  EMAIL_INVALID: "errEmailInvalid",
  EMAIL_TAKEN: "errEmailTaken",
  BARCODE_TAKEN: "errBarcodeTaken",
  LOGIN_TAKEN: "errLoginTaken",
  DATE_INVALID: "errDateInvalid",
  DATE_ORDER: "errDateOrder",
  CLASS_UNKNOWN: "errClassUnknown",
};

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
      <span className="text-caption font-medium text-foreground-muted">{label}</span>
      {children}
      {hint ? <span className="text-caption text-foreground-subtle">{hint}</span> : null}
      {error ? <span className="text-caption text-danger">{error}</span> : null}
    </label>
  );
}

export function ReaderForm({
  values,
  schoolClasses,
  categories,
  statuses,
  schoolYearLabel,
  messages,
}: {
  values: PatronInput;
  schoolClasses: Option[];
  categories: Option[];
  statuses: Option[];
  schoolYearLabel: string;
  messages: Messages;
}) {
  const [state, formAction, pending] = useActionState(
    createPatronAction,
    READER_IDLE,
  );
  const r = messages.readers;

  const shown = (state.kind === "invalid" ? state.values : values) ?? values;
  const formKey = state.kind === "invalid" ? `attempt-${state.attempt}` : "initial";
  const errorFor = (field: PatronField) => {
    if (state.kind !== "invalid") return undefined;
    const code = state.errors[field];
    return code ? r[MESSAGE_FOR[code]] : undefined;
  };

  return (
    <div className="stack gap-content">
      <form key={formKey} action={formAction} className="stack gap-content">
        <div className="grid gap-inline sm:grid-cols-2">
          {/* The email leads: it identifies the reader and becomes the login. */}
          <div className="sm:col-span-2">
            <Field
              label={r.fieldEmail}
              hint={r.fieldEmailHint}
              error={errorFor("email")}
            >
              <input
                name="email"
                type="email"
                defaultValue={shown.email}
                required
                autoFocus
                autoComplete="off"
                className={FIELD}
              />
            </Field>
          </div>

          <Field label={r.fieldLastName} error={errorFor("lastName")}>
            <input name="lastName" defaultValue={shown.lastName} required className={FIELD} />
          </Field>

          <Field label={r.fieldFirstName} error={errorFor("firstName")}>
            <input name="firstName" defaultValue={shown.firstName} required className={FIELD} />
          </Field>

          <Field
            label={r.fieldBarcode}
            hint={r.fieldBarcodeHint}
            error={errorFor("barcode")}
          >
            <input
              name="barcode"
              defaultValue={shown.barcode}
              autoComplete="off"
              className={`${FIELD} font-mono`}
            />
          </Field>

          <Field label={r.fieldLogin} hint={r.fieldLoginHint} error={errorFor("login")}>
            <input
              name="login"
              defaultValue={shown.login}
              autoComplete="off"
              className={FIELD}
            />
          </Field>

          <Field label={r.fieldClass}>
            <select name="schoolClassId" defaultValue={shown.schoolClassId} className={FIELD}>
              <option value="">{r.optionNone}</option>
              {schoolClasses.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={r.fieldGender}>
            <select name="gender" defaultValue={shown.gender} className={FIELD}>
              <option value="">{r.optionNone}</option>
              <option value="F">{r.genderFemale}</option>
              <option value="M">{r.genderMale}</option>
            </select>
          </Field>

          <Field label={r.fieldCategory}>
            <select name="categoryId" defaultValue={shown.categoryId} className={FIELD}>
              <option value="">{r.optionNone}</option>
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={r.fieldStatus}>
            <select name="statusId" defaultValue={shown.statusId} className={FIELD}>
              <option value="">{r.optionNone}</option>
              {statuses.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={r.fieldEnrolledOn}
            hint={fill(r.schoolYearHint, { label: schoolYearLabel })}
            error={errorFor("enrolledOn")}
          >
            <input
              name="enrolledOn"
              type="date"
              defaultValue={shown.enrolledOn}
              className={FIELD}
            />
          </Field>

          <Field label={r.fieldExpiresOn} error={errorFor("expiresOn")}>
            <input
              name="expiresOn"
              type="date"
              defaultValue={shown.expiresOn}
              className={FIELD}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label={r.fieldNotes}>
              <textarea
                name="notes"
                defaultValue={shown.notes}
                rows={2}
                className={`${FIELD} py-2`}
              />
            </Field>
          </div>
        </div>

        <button type="submit" className={`${PRIMARY} w-fit`} disabled={pending}>
          {r.create}
        </button>
      </form>

      {state.kind === "created" ? (
        <div className="stack gap-1" aria-live="polite">
          <p className="text-body-sm text-success">
            {fill(r.created, { name: state.name, barcode: state.barcode })}
          </p>
          <p className="text-caption text-foreground-muted">{r.noPasswordNotice}</p>
        </div>
      ) : null}
    </div>
  );
}
