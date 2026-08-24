import Link from "next/link";
import { HorizontalLogo } from "@/app/_components/horizontal-logo";
import { PreferencesBar } from "@/app/_components/preferences-bar";
import { messagesFor } from "@/lib/i18n";
import { getLocale, getTheme } from "@/lib/preferences";
import { logout } from "../(auth)/_actions/logout";
import { requireSession } from "../(auth)/_lib/session";
import { SidebarNav } from "./_components/sidebar-nav";

/**
 * Back-office shell. Every route under /gestion is staff-only, so the session
 * check lives here rather than being repeated per page.
 *
 * The sidebar keeps the mockup's dark navy panel in both themes — it is the
 * brand's primary colour, not a light-mode surface.
 */
export default async function GestionLayout({ children }: LayoutProps<"/">) {
  const [session, theme, locale] = await Promise.all([
    requireSession("gestion"),
    getTheme(),
    getLocale(),
  ]);
  const messages = messagesFor(locale);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="stack gap-content bg-[#0f1b2e] p-4 lg:w-64 lg:shrink-0">
        <Link
          href="/gestion"
          className="rounded-control outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <HorizontalLogo theme="dark" className="w-32" />
        </Link>

        <p className="text-caption uppercase tracking-wide text-white/50">
          {messages.portals.gestion.name}
        </p>

        <SidebarNav messages={messages} />

        <form action={logout} className="mt-auto">
          <input type="hidden" name="portal" value="gestion" />
          <button
            type="submit"
            className="w-full rounded-control border border-white/20 px-4 py-2.5 text-body-sm text-white/80 outline-offset-2 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
          >
            {messages.signOut}
          </button>
        </form>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-surface">
          <div className="container-page cluster justify-between gap-content py-3">
            <p className="text-body-sm text-foreground-muted">
              {messages.signedInAs} <strong>{session.name}</strong>
            </p>
            <PreferencesBar theme={theme} locale={locale} messages={messages} />
          </div>
        </header>

        <main className="container-page flex-1 py-page-y">{children}</main>
      </div>
    </div>
  );
}
