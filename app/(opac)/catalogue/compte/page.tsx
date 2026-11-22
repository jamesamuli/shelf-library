import Link from "next/link";
import type { Metadata } from "next";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { formatDate } from "@/lib/dates";
import { Heart } from "lucide-react";
import { getPatronAccount, type LoanRow } from "@/lib/circulation";
import { listOwnHolds } from "@/lib/holds";
import { listLikedRecords } from "@/lib/likes";
import { logout } from "@/app/(auth)/_actions/logout";
import { requireSession } from "@/app/(auth)/_lib/session";
import { RenewButton } from "./_components/renew-button";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const [session, locale] = await Promise.all([
    requireSession("opac"),
    getLocale(),
  ]);
  const messages = messagesFor(locale);
  const c = messages.circulation;
  const cat = messages.catalogue;
  const patronId = Number(session.sub);
  const [account, holds, favorites] = await Promise.all([
    getPatronAccount(patronId),
    listOwnHolds(patronId),
    listLikedRecords(patronId),
  ]);

  const title = (loan: LoanRow) =>
    loan.recordId ? (
      <Link
        href={`/catalogue/${loan.recordId}`}
        className="text-accent underline-offset-2 hover:underline"
      >
        {loan.title}
      </Link>
    ) : (
      loan.title
    );

  return (
    <div className="stack gap-section">
      <header className="cluster justify-between gap-content">
        <div className="stack gap-inline">
          <h1 className="font-heading text-heading-1">{c.accountTitle}</h1>
          <p className="text-body text-foreground-muted">
            {fill(messages.greetingReturning, { name: session.name })}
          </p>
        </div>
        <form action={logout}>
          <input type="hidden" name="portal" value="opac" />
          <button
            type="submit"
            className="min-h-11 cluster items-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            {messages.signOut}
          </button>
        </form>
      </header>

      <section className="stack gap-content">
        <h2 className="font-heading text-heading-3">{c.accountCurrent}</h2>

        {account.current.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-body-sm text-foreground-muted">
            {c.accountNoCurrent}
          </p>
        ) : (
          <>
            <ul className="stack gap-inline">
              {account.current.map((loan) => (
                <li
                  key={loan.id}
                  className="stack gap-inline rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="stack gap-0.5">
                    <span className="text-body font-medium">{title(loan)}</span>
                    <span
                      className={`text-caption ${loan.daysLate > 0 ? "text-warning" : "text-foreground-muted"}`}
                    >
                      {loan.daysLate > 0
                        ? fill(c.statusLate, { count: String(loan.daysLate) })
                        : fill(c.dueOnDate, {
                            date: formatDate(loan.dueOn, locale),
                          })}
                    </span>
                  </div>
                  {account.canRenew ? (
                    <RenewButton
                      loanId={loan.id}
                      messages={messages}
                      locale={locale}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
            {account.canRenew ? (
              <p className="text-caption text-foreground-muted">
                {c.accountRenewHint}
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="stack gap-content">
        <h2 className="font-heading text-heading-3">{cat.holdsTitle}</h2>
        {holds.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">{cat.noHolds}</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[32rem] text-body-sm">
              <thead className="bg-surface-muted text-caption text-foreground-muted">
                <tr>
                  <th scope="col" className="p-3 text-left">{c.colDocument}</th>
                  <th scope="col" className="p-3 text-left">{cat.colPlacedOn}</th>
                  <th scope="col" className="p-3 text-left">{c.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {holds.map((hold) => (
                  <tr key={hold.id} className="border-t border-border">
                    <td className="p-3">
                      {hold.recordId ? (
                        <Link href={`/catalogue/${hold.recordId}`} className="text-accent underline-offset-2 hover:underline">
                          {hold.title}
                        </Link>
                      ) : (
                        hold.title
                      )}
                    </td>
                    <td className="p-3">{formatDate(hold.placedAt, locale)}</td>
                    <td className={`p-3 ${hold.readyUntil ? "font-medium text-success" : "text-foreground-muted"}`}>
                      {hold.readyUntil
                        ? fill(cat.holdReady, { date: formatDate(hold.readyUntil, locale) })
                        : cat.holdWaiting}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stack gap-content">
        <h2 className="font-heading text-heading-3">{cat.favoritesTitle}</h2>
        {favorites.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">{cat.noFavorites}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {favorites.map((record) => (
              <li key={record.id}>
                <Link
                  href={`/catalogue/${record.id}`}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 outline-offset-2 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Heart aria-hidden="true" className="size-5 shrink-0 fill-genre-raspberry text-genre-raspberry" />
                  <span className="stack min-w-0">
                    <span className="truncate font-semibold">{record.title}</span>
                    <span className="truncate text-caption text-foreground-muted">{record.authors.join(", ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack gap-content">
        <h2 className="font-heading text-heading-3">{c.accountHistory}</h2>

        {account.history.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">
            {c.accountNoHistory}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[32rem] text-body-sm">
              <thead className="bg-surface-muted text-caption text-foreground-muted">
                <tr>
                  <th scope="col" className="p-3 text-left">{c.colDocument}</th>
                  <th scope="col" className="p-3 text-left">{c.colLoanedOn}</th>
                  <th scope="col" className="p-3 text-left">{c.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {account.history.map((loan) => (
                  <tr key={loan.id} className="border-t border-border">
                    <td className="p-3">{title(loan)}</td>
                    <td className="p-3">{formatDate(loan.loanedAt, locale)}</td>
                    <td className="p-3 text-foreground-muted">
                      {fill(c.accountReturnedOn, {
                        date: formatDate(loan.returnedAt!, locale),
                      })}
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
