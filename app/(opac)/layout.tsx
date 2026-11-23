import Link from "next/link";
import { EfbLogo } from "@/app/_components/efb-logo";
import { ShelfMark } from "@/app/_components/shelf-mark";
import { PreferencesBar } from "@/app/_components/preferences-bar";
import { listGenres } from "@/lib/catalogue";
import { messagesFor } from "@/lib/i18n";
import { getLocale, getTheme } from "@/lib/preferences";
import { getSession } from "@/app/(auth)/_lib/session";
import { GenreList } from "./_components/genre-tile";
import { MobileDock } from "./_components/mobile-dock";
import { RouteLoader } from "./_components/route-loader";
import { SearchSheet } from "./_components/search-sheet";

/**
 * The catalogue is public: it renders signed in or out, matching legacy, where
 * `opac_css/` was browsable without an account. The header only changes which
 * link it offers.
 */
export default async function CatalogueLayout({ children }: LayoutProps<"/">) {
  const [theme, locale, session] = await Promise.all([getTheme(), getLocale(), getSession("opac")]);
  const messages = messagesFor(locale);
  const c = messages.catalogue;
  const genres = await listGenres(locale);
  const account = session
    ? { href: "/catalogue/compte", label: c.myAccount, signedIn: true }
    : { href: "/login/opac", label: messages.signIn, signedIn: false };

  return (
    // Positioned and isolated for the home's falling books, which fill this
    // box behind the header and the content.
    <div className="relative isolate flex flex-1 flex-col">
      {/* Hidden until focused: the first Tab stop on every OPAC page, so
          keyboard readers can jump past the header controls. */}
      <a
        href="#main-content"
        className="sr-only z-50 rounded-control bg-primary text-body-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {messages.skipToContent}
      </a>
      <header className="border-b border-border bg-surface">
        {/* On phones, one row (CDI request): the school's logo alone on the
            left — the Shelf mark and its rule step aside — and the theme
            and language controls, compacted, on the right. Sign-in moves to
            the bottom bar there. */}
        <div className="container-page flex items-center justify-between gap-3 py-3 sm:flex-wrap sm:gap-content sm:py-4">
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
            <Link
              href={account.href}
              className="cluster min-h-11 items-center whitespace-nowrap rounded-control bg-primary px-4 font-heading text-body font-semibold text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring max-sm:hidden"
            >
              {account.label}
            </Link>
          </div>
        </div>
      </header>

      {/* Padded at the foot on phones, so the bottom bar never covers content. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="container-page flex-1 py-page-y outline-none max-sm:pb-28"
      >
        {children}
      </main>

      <MobileDock
        label={c.dockLabel}
        closeLabel={c.closePanel}
        discover={{
          title: c.discover,
          button: c.discover,
          content: <GenreList genres={genres} all={{ label: c.discoverAll, hint: c.discoverAllHint }} />,
        }}
        search={{
          title: c.searchPanelTitle,
          button: c.searchAction,
          content: <SearchSheet messages={messages} id="catalogue-q-sheet" />,
        }}
        account={account}
      />

      <RouteLoader label={c.loadingPage} />
    </div>
  );
}
