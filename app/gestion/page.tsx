import Link from "next/link";
import type { Metadata } from "next";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { formatDate } from "@/lib/dates";
import { getCirculationOverview } from "@/lib/circulation";
import { requireSession } from "../(auth)/_lib/session";

export const metadata: Metadata = { title: "Gestion" };

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div className="stack gap-1 rounded-card border border-border bg-surface p-4">
      <span className="text-caption text-foreground-muted">{label}</span>
      <span
        className={`font-serif text-heading-2 ${tone === "warning" && value > 0 ? "text-warning" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default async function GestionDashboard() {
  const [session, locale] = await Promise.all([
    requireSession("gestion"),
    getLocale(),
  ]);
  const messages = messagesFor(locale);
  const c = messages.circulation;
  const overview = await getCirculationOverview();

  return (
    <div className="stack gap-section">
      <header className="stack gap-inline">
        <h1 className="font-serif text-heading-1">
          {fill(c.dashboardTitle, { name: session.name })}
        </h1>
        <p className="text-body text-foreground-muted">{c.dashboardIntro}</p>
      </header>

      <section className="grid gap-inline sm:grid-cols-2 xl:grid-cols-5">
        <Stat label={c.statRecords} value={overview.records} />
        <Stat label={c.statItems} value={overview.items} />
        <Stat label={c.statPatrons} value={overview.patrons} />
        <Stat label={c.statActiveLoans} value={overview.activeLoans} />
        <Stat label={c.statOverdue} value={overview.overdueLoans} tone="warning" />
      </section>

      <section className="stack gap-content">
        <div className="cluster justify-between gap-inline">
          <h2 className="font-serif text-heading-3">{c.recentLoans}</h2>
          <Link
            href="/gestion/circulation"
            className="cluster min-h-11 items-center rounded-control bg-primary px-4 text-caption font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
          >
            {c.deskTitle}
          </Link>
        </div>

        {overview.recent.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-body-sm text-foreground-muted">
            {c.noRecentLoans}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[42rem] text-body-sm">
              <thead className="bg-surface-muted text-caption text-foreground-muted">
                <tr>
                  <th scope="col" className="p-3 text-left">{c.colMember}</th>
                  <th scope="col" className="p-3 text-left">{c.colDocument}</th>
                  <th scope="col" className="p-3 text-left">{c.colLoanedOn}</th>
                  <th scope="col" className="p-3 text-left">{c.colDueOn}</th>
                  <th scope="col" className="p-3 text-left">{c.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent.map((loan) => (
                  <tr key={loan.id} className="border-t border-border">
                    <td className="p-3">
                      <Link
                        href={`/gestion/circulation?patron=${encodeURIComponent(loan.patronBarcode)}`}
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        {loan.patron}
                      </Link>
                    </td>
                    <td className="p-3">{loan.title}</td>
                    <td className="p-3">{formatDate(loan.loanedAt, locale)}</td>
                    <td className="p-3">{formatDate(loan.dueOn, locale)}</td>
                    <td className="p-3">
                      {loan.daysLate > 0 ? (
                        <span className="text-warning">
                          {fill(c.statusLate, { count: String(loan.daysLate) })}
                        </span>
                      ) : (
                        <span className="text-success">{c.statusOnLoan}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
