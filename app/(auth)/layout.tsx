import { messagesFor } from "@/lib/i18n";
import { getLocale, getTheme } from "@/lib/preferences";
import { HorizontalLogo } from "@/app/_components/horizontal-logo";
import { PreferencesBar } from "@/app/_components/preferences-bar";

/**
 * Single centered card, per the login mockup in the brand kit: logo at the top
 * of the card, content below, trust markers outside it. The theme and language
 * switches sit above the card, mirroring the header controls in the dashboard
 * mockups.
 */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const [theme, locale] = await Promise.all([getTheme(), getLocale()]);
  const messages = messagesFor(locale);

  return (
    <main className="container-page flex flex-1 flex-col justify-center py-page-y">
      <div className="mx-auto w-full max-w-md stack gap-content">
        <PreferencesBar theme={theme} locale={locale} messages={messages} />

        <div className="stack gap-content rounded-panel border border-border bg-surface p-6 shadow-card sm:p-8">
          <div className="center">
            <HorizontalLogo theme={theme} />
          </div>
          {children}
        </div>

        <ul className="cluster justify-center gap-4 text-center">
          {messages.trust.map((item) => (
            <li key={item.title} className="stack">
              <span className="text-caption font-medium text-foreground">
                {item.title}
              </span>
              <span className="text-caption text-foreground-subtle">
                {item.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
