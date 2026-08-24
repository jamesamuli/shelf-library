import Link from "next/link";
import type { Metadata } from "next";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { formatDate } from "@/lib/dates";
import { findPatron, getPatronDesk } from "@/lib/circulation";
import { requireSession } from "../../(auth)/_lib/session";
import {
  CheckInForm,
  CheckOutForm,
  LoanActions,
} from "./_components/desk-forms";

export const metadata: Metadata = { title: "Circulation" };

function Panel({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
      <div className="stack gap-1">
        <h2 className="font-serif text-heading-3">{title}</h2>
        {intro ? (
          <p className="text-caption text-foreground-muted">{intro}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function CirculationDesk({
  searchParams,
}: PageProps<"/gestion/circulation">) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  await requireSession("gestion");

  const messages = messagesFor(locale);
  const c = messages.circulation;

  const requested = typeof params.patron === "string" ? params.patron : "";
  const found = requested ? await findPatron(requested) : null;
  const desk = found ? await getPatronDesk(found.id) : null;

  return (
    <div className="stack gap-section">
      <header className="stack gap-inline">
        <h1 className="font-serif text-heading-1">{c.deskTitle}</h1>
        <p className="text-body text-foreground-muted">{c.deskIntro}</p>
      </header>

      <div className="grid gap-content lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="stack gap-content">
          {desk === null ? (
            <Panel title={c.patronLabel}>
              {/* GET, so an open patron is a bookmarkable URL and the
                  dashboard can link straight to one. */}
              <form method="get" className="stack gap-inline">
                <label className="stack gap-1.5">
                  <span className="sr-only">{c.patronLabel}</span>
                  <input
                    name="patron"
                    defaultValue={requested}
                    placeholder={c.patronPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    required
                    autoFocus
                    className="min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm font-mono outline-offset-2 placeholder:font-sans placeholder:text-foreground-subtle focus-visible:outline-2 focus-visible:outline-ring"
                  />
                </label>
                <button
                  type="submit"
                  className="min-h-11 cluster w-fit items-center justify-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {c.patronFind}
                </button>
                {requested ? (
                  <p className="text-body-sm text-danger" aria-live="polite">
                    {c.patronNotFound}
                  </p>
                ) : null}
              </form>
            </Panel>
          ) : (
            <>
              <Panel title={desk.patron.name}>
                <dl className="grid gap-inline text-body-sm sm:grid-cols-3">
                  <div className="stack gap-0.5">
                    <dt className="text-caption text-foreground-muted">
                      {c.patronLabel}
                    </dt>
                    <dd className="font-mono">{desk.patron.barcode}</dd>
                  </div>
                  {/* Term then definition, not value then value: the category
                      is what the row is about, the quota is a separate fact. */}
                  <div className="stack gap-0.5">
                    <dt className="text-caption text-foreground-muted">
                      {c.patronCategoryLabel}
                    </dt>
                    <dd>
                      {desk.patron.category ?? "—"}
                      {" · "}
                      {desk.patron.quota === null
                        ? fill(c.patronQuotaNone, {
                            used: String(desk.patron.activeLoans),
                          })
                        : fill(c.patronQuota, {
                            used: String(desk.patron.activeLoans),
                            quota: String(desk.patron.quota),
                          })}
                    </dd>
                  </div>
                  <div className="stack gap-0.5">
                    <dt className="text-caption text-foreground-muted">
                      {c.patronMembershipLabel}
                    </dt>
                    <dd>
                      {desk.patron.status ?? "—"}
                      {" · "}
                      {desk.patron.expiresOn
                        ? fill(c.patronExpiresOn, {
                            date: formatDate(desk.patron.expiresOn, locale),
                          })
                        : c.patronNoExpiry}
                    </dd>
                  </div>
                </dl>
                <Link
                  href="/gestion/circulation"
                  className="text-caption text-accent underline-offset-2 hover:underline"
                >
                  {c.patronChange}
                </Link>
              </Panel>

              <Panel title={c.checkOutTitle} intro={c.checkOutIntro}>
                <CheckOutForm
                  patronId={desk.patron.id}
                  messages={messages}
                  locale={locale}
                />
              </Panel>

              <Panel title={c.loansTitle}>
                {desk.loans.length === 0 ? (
                  <p className="text-body-sm text-foreground-muted">
                    {c.noLoans}
                  </p>
                ) : (
                  <ul className="stack gap-inline">
                    {desk.loans.map((loan) => (
                      <li
                        key={loan.id}
                        className="stack gap-inline rounded-card border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="stack gap-0.5">
                          <span className="text-body-sm font-medium">
                            {loan.recordId ? (
                              <Link
                                href={`/catalogue/${loan.recordId}`}
                                className="text-accent underline-offset-2 hover:underline"
                              >
                                {loan.title}
                              </Link>
                            ) : (
                              loan.title
                            )}
                          </span>
                          <span className="text-caption font-mono text-foreground-muted">
                            {loan.itemBarcode}
                          </span>
                          <span
                            className={`text-caption ${loan.daysLate > 0 ? "text-warning" : "text-foreground-muted"}`}
                          >
                            {loan.daysLate > 0
                              ? fill(c.statusLate, {
                                  count: String(loan.daysLate),
                                })
                              : fill(c.dueOnDate, {
                                  date: formatDate(loan.dueOn, locale),
                                })}
                            {loan.renewalCount > 0
                              ? ` · ${c.colRenewals}: ${loan.renewalCount}`
                              : ""}
                          </span>
                        </div>
                        <LoanActions
                          loanId={loan.id}
                          itemBarcode={loan.itemBarcode}
                          messages={messages}
                          locale={locale}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </div>

        {/* Check-in never needs a patron, so it stays reachable whatever
            else is on screen — legacy made it a separate mode. */}
        <Panel title={c.checkInTitle} intro={c.checkInIntro}>
          <CheckInForm messages={messages} locale={locale} />
        </Panel>
      </div>
    </div>
  );
}
