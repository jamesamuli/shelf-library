import Link from "next/link";
import { House } from "lucide-react";
import { messagesFor } from "@/lib/i18n";
import { getLocale, getTheme } from "@/lib/preferences";
import { EfbLogo } from "@/app/_components/efb-logo";
import { ShelfMark } from "@/app/_components/shelf-mark";
import { PreferencesBar } from "@/app/_components/preferences-bar";
import { FloatingBooks } from "./_components/floating-books";

/**
 * The logos and an "Accueil" button lead back to the catalogue home; the
 * theme and language switches sit beside that button, as in the OPAC header. Books drift behind the whole
 * page: the outer frame spans the viewport (not just the content column) and
 * clips them, so a book floating past an edge never adds a scrollbar.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [theme, locale] = await Promise.all([getTheme(), getLocale()]);
  const messages = messagesFor(locale);

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden">
      <FloatingBooks quotes={messages.quotes} />
      <div className="container-page flex flex-1 flex-col gap-section py-page-y">
        {/* On phones, one row like the catalogue's: the school's logo alone
            on the left, the controls compacted on the right. */}
        <header className="flex items-center justify-between gap-3 sm:flex-wrap sm:gap-content">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 rounded-control outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ShelfMark
              label="Shelf Library"
              gap="fill-surface"
              className="h-14 w-auto max-sm:hidden"
            />
            <span aria-hidden="true" className="h-10 w-px bg-border-strong max-sm:hidden" />
            <EfbLogo className="size-[3.6rem] sm:size-[4.5rem]" />
          </Link>
          <div className="flex items-center gap-2 sm:flex-wrap">
            <PreferencesBar theme={theme} locale={locale} messages={messages} />
            {/* Styled like the catalogue header's "Se connecter", so the way
                back reads as the page's main header action. On phones it
                steps aside whenever the page has a bottom bar carrying it
                (the sign-in page's, marked `data-dock`); a page without one,
                like the forgotten-password page, keeps it here. */}
            <Link
              href="/"
              className="cluster min-h-11 items-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 font-heading text-body font-semibold text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring max-sm:[:root:has([data-dock])_&]:hidden"
            >
              <House aria-hidden="true" className="size-4" strokeWidth={2.25} />
              {messages.home}
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
