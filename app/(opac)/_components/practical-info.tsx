import Link from "next/link";
import {
  BookUp,
  Clock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_LOAN_DAYS, MAX_RENEWALS } from "@/lib/circulation";
import { fill, type Messages } from "@/lib/i18n";
import { LIBRARY_INFO } from "@/lib/library-info";
import type { Locale } from "@/lib/preferences";

type Entry = { Icon: LucideIcon; title: string; body: React.ReactNode };

/**
 * "Infos pratiques" on the catalogue home (CDI request). Two kinds of entry:
 * what the app itself enforces — loan length, renewals, returns at the desk —
 * which is always true and always shown; and what only the CDI can say —
 * hours, where to find it, how to reach it — read from lib/library-info.ts
 * and shown once filled in.
 *
 * The loan length is the standard one; a reader category can set its own
 * (patron_categories.loan_duration_days), which the account page shows per
 * loan.
 */
export function PracticalInfo({
  messages,
  locale,
  accountHref,
}: {
  messages: Messages;
  locale: Locale;
  accountHref: string;
}) {
  const c = messages.catalogue;
  const info = LIBRARY_INFO;

  const entries: Entry[] = [
    ...(info.hours.length > 0
      ? [
          {
            Icon: Clock,
            title: c.hoursTitle,
            body: (
              <ul>
                {info.hours.map((slot) => (
                  <li key={slot.days.fr}>
                    {slot.days[locale]} : {slot.time}
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    {
      Icon: BookUp,
      title: c.borrowTitle,
      body: fill(c.borrowText, { days: String(DEFAULT_LOAN_DAYS) }),
    },
    {
      Icon: RefreshCw,
      title: c.renewTitle,
      body: (
        <>
          {fill(c.renewText, { count: String(MAX_RENEWALS) })}{" "}
          <Link href={accountHref} className="font-medium text-accent underline underline-offset-2">
            {c.myAccount}
          </Link>
        </>
      ),
    },
    { Icon: Undo2, title: c.returnTitle, body: c.returnText },
    ...(info.place ? [{ Icon: MapPin, title: c.placeTitle, body: info.place[locale] }] : []),
    ...(info.email
      ? [
          {
            Icon: Mail,
            title: c.emailTitle,
            body: (
              <a
                href={`mailto:${info.email}`}
                className="font-medium text-accent underline underline-offset-2"
              >
                {info.email}
              </a>
            ),
          },
        ]
      : []),
    ...(info.phone
      ? [
          {
            Icon: Phone,
            title: c.phoneTitle,
            body: (
              <a
                href={`tel:${info.phone.replace(/[^\d+]/g, "")}`}
                className="font-medium text-accent underline underline-offset-2"
              >
                {info.phone}
              </a>
            ),
          },
        ]
      : []),
  ];

  return (
    <section
      aria-labelledby="practical"
      className="stack gap-content rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id="practical" className="font-heading text-heading-2">
        {c.practicalTitle}
      </h2>
      {/* A <dl> group may hold only its <dt> and <dd>, so the icon rides in
          the term and the description is indented to line up under its text
          (2.5rem icon + 0.75rem gap). */}
      <dl className="grid gap-4">
        {entries.map(({ Icon, title, body }) => (
          <div key={title} className="stack gap-0.5">
            <dt className="flex items-center gap-3 font-heading text-body font-semibold">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent"
              >
                <Icon className="size-5" strokeWidth={2} />
              </span>
              {title}
            </dt>
            <dd className="-mt-3 pl-13 text-body-sm text-foreground-muted">{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
