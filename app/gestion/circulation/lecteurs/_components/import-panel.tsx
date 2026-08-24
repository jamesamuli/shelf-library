"use client";

import { useActionState } from "react";
import { fill, type Messages } from "@/lib/i18n";
import type { ImportRowError, PreviewRow } from "@/lib/patron-import";
import { confirmImportAction, previewImportAction } from "../_actions";
import { IMPORT_IDLE, type ImportState } from "../_lib/state";

const BUTTON =
  "min-h-11 cluster items-center justify-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

const PRIMARY =
  "min-h-11 cluster items-center justify-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

function describe(error: ImportRowError, messages: Messages): string {
  const r = messages.readers;
  switch (error.code) {
    case "REQUIRED":
      return r.errRequired;
    case "EMAIL_INVALID":
      return r.errEmailInvalid;
    case "EMAIL_TAKEN":
      return r.errEmailTaken;
    case "BARCODE_TAKEN":
      return r.errBarcodeTaken;
    case "DATE_INVALID":
      return r.errDateInvalid;
    case "DATE_ORDER":
      return r.errDateOrder;
    case "CLASS_UNKNOWN":
      return r.errClassUnknown;
    case "DUPLICATE_IN_FILE":
      return r.errDuplicateInFile;
    default:
      return r.errUnknownValue;
  }
}

/** Rejected rows as a file the librarian can fix and re-import. */
function rejectedHref(rows: PreviewRow[], messages: Messages): string {
  const header = ["ligne", "email", "nom", "prenom", "classe", "code_barres", "erreur"];
  const body = rows.map((row) =>
    [
      row.line,
      row.email,
      row.lastName,
      row.firstName,
      row.schoolClass,
      row.barcode,
      `"${row.errors.map((e) => describe(e, messages)).join(" ").replace(/"/g, '""')}"`,
    ].join(";"),
  );
  const csv = `﻿${[header.join(";"), ...body].join("\r\n")}`;
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function RowTable({
  rows,
  messages,
  onlyRejected = false,
}: {
  rows: PreviewRow[];
  messages: Messages;
  onlyRejected?: boolean;
}) {
  const r = messages.readers;
  const shown = onlyRejected ? rows.filter((row) => row.errors.length > 0) : rows;

  return (
    <div className="max-h-96 overflow-auto rounded-card border border-border">
      <table className="w-full min-w-[44rem] text-body-sm">
        <thead className="sticky top-0 bg-surface-muted text-caption text-foreground-muted">
          <tr>
            <th scope="col" className="p-2 text-left">{r.colLine}</th>
            <th scope="col" className="p-2 text-left">{r.colEmail}</th>
            <th scope="col" className="p-2 text-left">{r.colName}</th>
            <th scope="col" className="p-2 text-left">{r.colClass}</th>
            <th scope="col" className="p-2 text-left">{r.colBarcode}</th>
            <th scope="col" className="p-2 text-left">{r.colProblem}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr
              key={row.line}
              className={`border-t border-border ${row.errors.length > 0 ? "bg-danger/5" : ""}`}
            >
              <td className="p-2 text-foreground-muted">{row.line}</td>
              <td className="p-2">{row.email || "—"}</td>
              <td className="p-2">{`${row.firstName} ${row.lastName}`.trim() || "—"}</td>
              <td className="p-2">{row.schoolClass || "—"}</td>
              <td className="p-2 font-mono text-caption">
                {row.barcode || (
                  <span className="font-sans text-foreground-subtle">{r.barcodeAuto}</span>
                )}
              </td>
              <td className="p-2 text-caption text-danger">
                {row.errors.map((e) => describe(e, messages)).join(" ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImportPanel({ messages }: { messages: Messages }) {
  const [state, dispatch, pending] = useActionState<ImportState, FormData>(
    async (previous, formData) => {
      const intent = String(formData.get("intent") ?? "preview");
      if (intent === "confirm") return confirmImportAction(previous, formData);
      // Cancel needs no server work — dropping the preview is local.
      if (intent === "cancel") return IMPORT_IDLE;
      return previewImportAction(previous, formData);
    },
    IMPORT_IDLE,
  );
  const r = messages.readers;

  return (
    <div className="stack gap-content">
      {/* A plain anchor, not <Link>: the target is a route handler that only
          answers GET. A client-side navigation makes the router believe the
          page *is* that route, and the next Server Action then POSTs to it
          and gets a 405. The browser handles this as a download and leaves
          the page — and its router state — alone. */}
      <a
        href="/gestion/circulation/lecteurs/modele"
        download="modele-lecteurs.csv"
        className={`${BUTTON} w-fit`}
      >
        {r.downloadTemplate}
      </a>

      {state.kind !== "preview" ? (
        <form action={dispatch} className="stack gap-inline">
          <label className="stack gap-1.5">
            <span className="text-caption font-medium text-foreground-muted">
              {r.fileLabel}
            </span>
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="text-body-sm file:mr-3 file:min-h-11 file:rounded-control file:border file:border-border file:bg-surface-muted file:px-4 file:text-body-sm"
            />
            <span className="text-caption text-foreground-subtle">{r.fileHint}</span>
          </label>
          <button type="submit" className={`${PRIMARY} w-fit`} disabled={pending}>
            {r.analyse}
          </button>
        </form>
      ) : null}

      {state.kind === "error" ? (
        <p aria-live="polite" className="text-body-sm text-danger">
          {r[state.key]}
        </p>
      ) : null}

      {state.kind === "preview" ? (
        <div className="stack gap-inline">
          <p aria-live="polite" className="text-body-sm">
            {fill(r.previewSummary, {
              valid: String(state.preview.validCount),
              rejected: String(state.preview.rejectedCount),
            })}
          </p>

          <RowTable rows={state.preview.rows} messages={messages} />

          <div className="cluster gap-2">
            {/* The file rides along in a hidden field so confirming re-judges
                the same text server-side rather than trusting this preview. */}
            <form action={dispatch}>
              <input type="hidden" name="intent" value="confirm" />
              <input type="hidden" name="text" value={state.text} />
              <button
                type="submit"
                className={PRIMARY}
                disabled={pending || state.preview.validCount === 0}
              >
                {r.confirmImport}
              </button>
            </form>
            <form action={dispatch}>
              <input type="hidden" name="intent" value="cancel" />
              <button type="submit" className={BUTTON} disabled={pending}>
                {r.cancelImport}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {state.kind === "imported" ? (
        <div className="stack gap-inline">
          <p aria-live="polite" className="text-body-sm text-success">
            {fill(
              state.rejected.length > 0 ? r.importedWithRejects : r.imported,
              { count: String(state.created) },
            )}
          </p>
          {state.rejected.length > 0 ? (
            <>
              <RowTable rows={state.rejected} messages={messages} onlyRejected />
              <a
                href={rejectedHref(state.rejected, messages)}
                download="lecteurs-rejetes.csv"
                className={`${BUTTON} w-fit`}
              >
                {r.downloadRejects}
              </a>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
