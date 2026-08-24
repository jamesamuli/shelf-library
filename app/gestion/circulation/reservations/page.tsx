import Link from "next/link";
import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { formatDate } from "@/lib/dates";
import { countHolds, listHolds, listReshelving, type HoldView } from "@/lib/holds";
import { requireSession } from "../../../(auth)/_lib/session";
import { PlaceHoldForm, ReshelveForm } from "./_components/hold-actions";
import { HoldsTable } from "./_components/holds-table";

export const metadata: Metadata = { title: "Réservations" };

type Tab = "encours" | "depassee" | "docranger";

function isTab(value: string): value is Tab {
  return value === "encours" || value === "depassee" || value === "docranger";
}

function TabLink({
  tab,
  current,
  label,
  count,
}: {
  tab: Tab;
  current: Tab;
  label: string;
  count: number;
}) {
  const active = tab === current;
  return (
    <Link
      href={`/gestion/circulation/reservations?onglet=${tab}`}
      aria-current={active ? "page" : undefined}
      className={`min-h-11 cluster items-center gap-2 rounded-control px-4 text-body-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border hover:bg-surface-muted"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-2 text-caption ${
          active ? "bg-white/20" : "bg-surface-muted text-foreground-muted"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

export default async function ReservationsPage({
  searchParams,
}: PageProps<"/gestion/circulation/reservations">) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  await requireSession("gestion");

  const messages = messagesFor(locale);
  const h = messages.holds;

  const requested = typeof params.onglet === "string" ? params.onglet : "encours";
  const tab: Tab = isTab(requested) ? requested : "encours";

  const [counts, holds, reshelving] = await Promise.all([
    countHolds(),
    tab === "docranger"
      ? Promise.resolve([] as HoldView[])
      : listHolds(tab === "depassee" ? "depassee" : "encours"),
    tab === "docranger" ? listReshelving() : Promise.resolve([]),
  ]);

  return (
    <div className="stack gap-section">
      <header className="stack gap-inline">
        <h1 className="font-serif text-heading-1">{h.title}</h1>
        <p className="text-body text-foreground-muted">{h.intro}</p>
      </header>

      <nav className="cluster gap-2" aria-label={h.title}>
        <TabLink tab="encours" current={tab} label={h.tabCurrent} count={counts.current} />
        <TabLink tab="depassee" current={tab} label={h.tabOutdated} count={counts.outdated} />
        <TabLink
          tab="docranger"
          current={tab}
          label={h.tabReshelving}
          count={counts.reshelving}
        />
      </nav>

      {tab === "docranger" ? (
        <div className="stack gap-content">
          <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
            <div className="stack gap-1">
              <h2 className="font-serif text-heading-3">{h.reshelvingTitle}</h2>
              <p className="text-caption text-foreground-muted">
                {h.reshelvingIntro}
              </p>
            </div>
            <ReshelveForm messages={messages} />
          </section>

          {reshelving.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-6 text-center text-body-sm text-foreground-muted">
              {h.noReshelving}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[38rem] text-body-sm">
                <thead className="bg-surface-muted text-caption text-foreground-muted">
                  <tr>
                    <th scope="col" className="p-3 text-left">{h.colCopy}</th>
                    <th scope="col" className="p-3 text-left">{h.colDocument}</th>
                    <th scope="col" className="p-3 text-left">{h.colLocation}</th>
                    <th scope="col" className="p-3 text-left">{h.colPlacedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {reshelving.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="p-3 font-mono text-caption">{row.itemBarcode}</td>
                      <td className="p-3">{row.title}</td>
                      <td className="p-3 text-caption text-foreground-muted">
                        {row.location} · {row.section}
                        {row.callNumber ? ` · ${row.callNumber}` : ""}
                      </td>
                      <td className="p-3 text-foreground-muted">
                        {formatDate(row.flaggedAt, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="stack gap-content">
          {/* Always rendered, empty or not: it owns the action feedback, and
              lending or deleting the last reservation empties the list. */}
          <HoldsTable
            holds={holds}
            late={tab === "depassee"}
            locale={locale}
            messages={messages}
            emptyLabel={tab === "depassee" ? h.noOutdated : h.noCurrent}
          />

          <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
            <div className="stack gap-1">
              <h2 className="font-serif text-heading-3">{h.newTitle}</h2>
              <p className="text-caption text-foreground-muted">{h.newIntro}</p>
            </div>
            <PlaceHoldForm messages={messages} />
          </section>
        </div>
      )}
    </div>
  );
}
