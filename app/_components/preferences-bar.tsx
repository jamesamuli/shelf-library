import { setLocale, setTheme } from "@/lib/preferences-actions";
import type { Messages } from "@/lib/i18n";
import { LOCALES, type Locale, type Theme } from "@/lib/preferences";

/**
 * Theme and language switches. Plain forms posting to Server Actions, so both
 * work without JavaScript and the new preference is server-rendered on the
 * next paint rather than applied by a client effect.
 */

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-4"
      aria-hidden="true"
    >
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CONTROL =
  "cluster min-h-11 justify-center gap-1.5 rounded-control border border-border px-3 text-caption text-foreground-muted outline-offset-2 hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function PreferencesBar({
  theme,
  locale,
  messages,
}: {
  theme: Theme;
  locale: Locale;
  messages: Messages;
}) {
  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  return (
    <div className="cluster justify-end gap-2">
      <form action={setTheme}>
        <input type="hidden" name="theme" value={nextTheme} />
        <button
          type="submit"
          className={CONTROL}
          aria-label={nextTheme === "dark" ? messages.toDark : messages.toLight}
        >
          {nextTheme === "dark" ? <MoonIcon /> : <SunIcon />}
          <span>{nextTheme === "dark" ? "Dark" : "Light"}</span>
        </button>
      </form>

      <form action={setLocale} className="cluster gap-1">
        <span className="sr-only" id="language-label">
          {messages.languageLabel}
        </span>
        {LOCALES.map((code) => (
          <button
            key={code}
            type="submit"
            name="locale"
            value={code}
            aria-describedby="language-label"
            aria-current={code === locale ? "true" : undefined}
            className={`min-h-11 min-w-11 rounded-control border px-3 text-caption uppercase outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${
              code === locale
                ? "border-border-strong bg-surface-muted text-foreground"
                : "border-border text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {code}
          </button>
        ))}
      </form>
    </div>
  );
}
