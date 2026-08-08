import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getRecord } from "@/lib/catalogue";

export async function generateMetadata({
  params,
}: PageProps<"/catalogue/[id]">): Promise<Metadata> {
  const { id } = await params;
  const record = await getRecord(Number(id));
  return { title: record?.title ?? "Catalogue" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="stack gap-0.5 border-t border-border py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-caption font-medium text-foreground-muted">{label}</dt>
      <dd className="text-body-sm sm:col-span-2">{children}</dd>
    </div>
  );
}

export default async function RecordPage({
  params,
}: PageProps<"/catalogue/[id]">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const record = await getRecord(numericId);
  const messages = messagesFor(await getLocale());
  const c = messages.catalogue;

  // Not found and "hidden from the OPAC" are deliberately indistinguishable.
  if (!record) {
    return (
      <div className="mx-auto max-w-md stack gap-content rounded-card border border-border bg-surface p-6 text-center">
        <h1 className="font-serif text-heading-3">{c.notFound}</h1>
        <p className="text-body-sm text-foreground-muted">{c.notFoundHint}</p>
        <Link
          href="/catalogue"
          className="min-h-11 cluster items-center justify-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {c.backToResults}
        </Link>
      </div>
    );
  }

  const authors = record.contributions.map((contribution) =>
    [contribution.author.forename, contribution.author.name]
      .filter(Boolean)
      .join(" "),
  );
  const publishers = record.recordPublishers.map((rp) => rp.publisher.name);
  const subjects = record.recordSubjects.flatMap((rs) =>
    rs.subject.labels.map((label) => label.label),
  );

  return (
    <article className="stack gap-content">
      <Link
        href="/catalogue"
        className="text-caption text-accent underline-offset-2 hover:underline"
      >
        ← {c.backToResults}
      </Link>

      <header className="stack gap-inline">
        <h1 className="font-serif text-heading-1">{record.title}</h1>
        {record.subtitle ? (
          <p className="text-body text-foreground-muted">{record.subtitle}</p>
        ) : null}
        {authors.length > 0 ? (
          <p className="text-body text-foreground-muted">
            {authors.join(", ")}
          </p>
        ) : null}
      </header>

      {record.abstract ? (
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-caption font-medium text-foreground-muted">
            {c.abstract}
          </h2>
          <p className="mt-1 text-body-sm">{record.abstract}</p>
        </section>
      ) : null}

      <section>
        <dl className="border-b border-border">
          {authors.length > 0 ? (
            <Field label={c.authors}>{authors.join(", ")}</Field>
          ) : null}
          {publishers.length > 0 ? (
            <Field label={c.publisher}>{publishers.join(", ")}</Field>
          ) : null}
          {record.publicationYear ? (
            <Field label={c.year}>{record.publicationYear}</Field>
          ) : null}
          {record.standardNumber ? (
            <Field label={c.isbn}>
              <span className="font-mono">{record.standardNumber}</span>
            </Field>
          ) : null}
          {record.documentType ? (
            <Field label={c.documentType}>{record.documentType.label}</Field>
          ) : null}
          {record.collection ? (
            <Field label={c.collection}>{record.collection.name}</Field>
          ) : null}
          {record.series ? (
            <Field label={c.series}>{record.series.name}</Field>
          ) : null}
          {record.classificationIndex ? (
            <Field label={c.classification}>
              <span className="font-mono">
                {record.classificationIndex.code}
              </span>
            </Field>
          ) : null}
          {subjects.length > 0 ? (
            <Field label={c.subjects}>
              <span className="cluster gap-1.5">
                {subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-control bg-surface-muted px-2 py-0.5 text-caption"
                  >
                    {subject}
                  </span>
                ))}
              </span>
            </Field>
          ) : null}
        </dl>
      </section>

      <section className="stack gap-inline">
        <h2 className="font-serif text-heading-3">
          {c.holdings}{" "}
          <span className="text-body-sm font-normal text-foreground-muted">
            ({fill(c.copies, { count: String(record.holdings.length) })})
          </span>
        </h2>

        {record.holdings.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">{c.noHoldings}</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[36rem] text-body-sm">
              <thead className="bg-surface-muted text-caption text-foreground-muted">
                <tr>
                  <th scope="col" className="p-3 text-left">{c.callNumber}</th>
                  <th scope="col" className="p-3 text-left">{c.location}</th>
                  <th scope="col" className="p-3 text-left">{c.section}</th>
                  <th scope="col" className="p-3 text-left">{c.itemStatus}</th>
                </tr>
              </thead>
              <tbody>
                {record.holdings.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-3 font-mono">{item.callNumber ?? "—"}</td>
                    <td className="p-3">{item.location ?? "—"}</td>
                    <td className="p-3">{item.section ?? "—"}</td>
                    <td className="p-3">
                      {item.isOnLoan ? (
                        <span className="text-foreground-muted">
                          {item.dueOn
                            ? fill(c.onLoanUntil, {
                                date: item.dueOn.toLocaleDateString("fr-FR"),
                              })
                            : c.allOnLoan}
                        </span>
                      ) : (
                        <span className="text-success">
                          {item.status ?? c.onShelf}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}
