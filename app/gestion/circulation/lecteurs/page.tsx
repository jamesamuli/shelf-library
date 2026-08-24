import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import {
  currentSchoolYear,
  getPatronOptions,
  toDateInput,
  EMPTY_PATRON,
} from "@/lib/patrons";
import { requireSession } from "../../../(auth)/_lib/session";
import { ReaderForm } from "./_components/reader-form";
import { ImportPanel } from "./_components/import-panel";

export const metadata: Metadata = { title: "Nouveau lecteur" };

export default async function ReadersPage() {
  const [locale] = await Promise.all([getLocale(), requireSession("gestion")]);
  const messages = messagesFor(locale);
  const r = messages.readers;

  const options = await getPatronOptions();
  const year = currentSchoolYear();

  return (
    <div className="stack gap-section">
      <header className="stack gap-inline">
        <h1 className="font-serif text-heading-1">{r.title}</h1>
        <p className="text-body text-foreground-muted">{r.intro}</p>
      </header>

      {/* One screen, two ways in: enrol a reader, or import a class. Legacy
          kept these on separate pages. */}
      <div className="grid gap-content xl:grid-cols-2 xl:items-start">
        <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
          <div className="stack gap-1">
            <h2 className="font-serif text-heading-3">{r.formTitle}</h2>
            <p className="text-caption text-foreground-muted">{r.formIntro}</p>
          </div>
          <ReaderForm
            values={{
              ...EMPTY_PATRON,
              enrolledOn: toDateInput(year.startsOn),
              expiresOn: toDateInput(year.endsOn),
            }}
            schoolClasses={options.schoolClasses}
            categories={options.categories}
            statuses={options.statuses}
            schoolYearLabel={year.label}
            messages={messages}
          />
        </section>

        <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
          <div className="stack gap-1">
            <h2 className="font-serif text-heading-3">{r.importTitle}</h2>
            <p className="text-caption text-foreground-muted">{r.importIntro}</p>
          </div>
          <ImportPanel messages={messages} />
        </section>
      </div>
    </div>
  );
}
