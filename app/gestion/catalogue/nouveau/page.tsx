import Link from "next/link";
import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { EMPTY_RECORD, getCataloguingOptions } from "@/lib/cataloguing";
import { requireSession } from "../../../(auth)/_lib/session";
import { RecordForm } from "../_components/record-form";

export const metadata: Metadata = { title: "Nouvelle notice" };

export default async function NewRecordPage() {
  const [locale] = await Promise.all([getLocale(), requireSession("gestion")]);
  const messages = messagesFor(locale);
  const c = messages.cataloguing;
  const options = await getCataloguingOptions();

  return (
    <div className="stack gap-section">
      <div className="stack gap-inline">
        <Link
          href="/gestion/catalogue"
          className="text-caption text-accent underline-offset-2 hover:underline"
        >
          ← {c.backToList}
        </Link>
        <h1 className="font-serif text-heading-1">{c.newRecordTitle}</h1>
      </div>

      <section className="rounded-card border border-border bg-surface p-4 sm:p-6">
        <RecordForm
          id={null}
          values={EMPTY_RECORD}
          documentTypes={options.documentTypes}
          recordStatuses={options.recordStatuses}
          copyCount={0}
          messages={messages}
        />
      </section>

      {/* Copies need a record id, so they are added after the first save. */}
    </div>
  );
}
