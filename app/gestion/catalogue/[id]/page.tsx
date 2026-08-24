import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getCataloguingOptions, getRecordForEdit } from "@/lib/cataloguing";
import { requireSession } from "../../../(auth)/_lib/session";
import { RecordForm } from "../_components/record-form";
import { CopiesEditor } from "../_components/copies-editor";

export const metadata: Metadata = { title: "Notice" };

export default async function EditRecordPage({
  params,
}: PageProps<"/gestion/catalogue/[id]">) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  await requireSession("gestion");

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const [record, options] = await Promise.all([
    getRecordForEdit(numericId),
    getCataloguingOptions(),
  ]);
  if (!record) notFound();

  const messages = messagesFor(locale);
  const c = messages.cataloguing;

  return (
    <div className="stack gap-section">
      <div className="stack gap-inline">
        <Link
          href="/gestion/catalogue"
          className="text-caption text-accent underline-offset-2 hover:underline"
        >
          ← {c.backToList}
        </Link>
        <div className="cluster justify-between gap-content">
          <h1 className="font-serif text-heading-1">{record.values.title}</h1>
          <Link
            href={`/catalogue/${record.id}`}
            className="min-h-11 cluster items-center rounded-control border border-border px-4 text-caption outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            {messages.circulation.navCatalogue}
          </Link>
        </div>
      </div>

      <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
        <h2 className="font-serif text-heading-3">{c.editRecordTitle}</h2>
        <RecordForm
          id={record.id}
          values={record.values}
          documentTypes={options.documentTypes}
          recordStatuses={options.recordStatuses}
          copyCount={record.items.length}
          messages={messages}
        />
      </section>

      <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
        <h2 className="font-serif text-heading-3">{c.copiesTitle}</h2>
        <CopiesEditor
          recordId={record.id}
          copies={record.items}
          locations={options.locations}
          sections={options.sections}
          itemStatuses={options.itemStatuses}
          messages={messages}
        />
      </section>
    </div>
  );
}
