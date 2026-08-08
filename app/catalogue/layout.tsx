import Link from "next/link";
import { HorizontalLogo } from "@/app/_components/horizontal-logo";
import { PreferencesBar } from "@/app/_components/preferences-bar";
import { messagesFor } from "@/lib/i18n";
import { getLocale, getTheme } from "@/lib/preferences";
import { getSession } from "../(auth)/_lib/session";

/**
 * The catalogue is public: it renders signed in or out, matching legacy, where
 * `opac_css/` was browsable without an account. The header only changes which
 * link it offers.
 */
export default async function CatalogueLayout({ children }: LayoutProps<"/">) {
  const [theme, locale, session] = await Promise.all([
    getTheme(),
    getLocale(),
    getSession("opac"),
  ]);
  const messages = messagesFor(locale);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="container-page cluster justify-between gap-content py-4">
          <Link
            href="/catalogue"
            className="rounded-control outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <HorizontalLogo theme={theme} className="w-36" />
          </Link>

          <div className="cluster gap-2">
            <PreferencesBar theme={theme} locale={locale} messages={messages} />
            <Link
              href={session ? "/catalogue/compte" : "/login/opac"}
              className="cluster min-h-11 items-center rounded-control bg-primary px-4 text-caption font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
            >
              {session ? messages.catalogue.myAccount : messages.signIn}
            </Link>
          </div>
        </div>
      </header>

      <main className="container-page flex-1 py-page-y">{children}</main>
    </div>
  );
}
