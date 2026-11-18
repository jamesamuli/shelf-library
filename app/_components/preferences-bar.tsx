import { Globe } from "lucide-react";
import { setLocale, setTheme } from "@/lib/preferences-actions";
import type { Messages } from "@/lib/i18n";
import { LOCALES, type Locale, type Theme, type ThemeSetting } from "@/lib/preferences";

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

/** Switches to `target`. Icon only on phones, where the header is one row. */
function ThemeButton({
  target,
  messages,
  className = "",
}: {
  target: Theme;
  messages: Messages;
  className?: string;
}) {
  return (
    <form action={setTheme} className={className}>
      <input type="hidden" name="theme" value={target} />
      <button
        type="submit"
        className={CONTROL}
        aria-label={target === "dark" ? messages.toDark : messages.toLight}
      >
        {target === "dark" ? <MoonIcon /> : <SunIcon />}
        <span className="max-sm:hidden">
          {target === "dark" ? messages.themeDark : messages.themeLight}
        </span>
      </button>
    </form>
  );
}

export function PreferencesBar({
  theme,
  locale,
  messages,
}: {
  theme: ThemeSetting;
  locale: Locale;
  messages: Messages;
}) {
  return (
    <div className="cluster justify-end gap-2">
      {/* Following the device's mode, which only the browser knows, both
          buttons are sent and the media query shows the one that switches
          away from what is on screen. */}
      {theme === "system" ? (
        <>
          <ThemeButton
            target="dark"
            messages={messages}
            className="[@media(prefers-color-scheme:dark)]:hidden"
          />
          <ThemeButton
            target="light"
            messages={messages}
            className="hidden [@media(prefers-color-scheme:dark)]:block"
          />
        </>
      ) : (
        <ThemeButton target={theme === "dark" ? "light" : "dark"} messages={messages} />
      )}

      {/* The globe says "language" at a glance — on phones, where only the
          other language's code shows, a bare "EN" did not read as a switch. */}
      <form action={setLocale} className="cluster gap-1">
        <span className="sr-only" id="language-label">
          {messages.languageLabel}
        </span>
        <Globe
          aria-hidden="true"
          className="size-4 text-foreground-muted max-sm:hidden"
          strokeWidth={2}
        />
        {LOCALES.map((code) => (
          <button
            key={code}
            type="submit"
            name="locale"
            value={code}
            aria-describedby="language-label"
            aria-current={code === locale ? "true" : undefined}
            // On phones only the other language shows — a one-tap switch that
            // keeps the header to one row.
            className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border px-3 text-caption uppercase outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${
              code === locale
                ? "border-border-strong bg-surface-muted text-foreground max-sm:hidden"
                : "border-border text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {code === locale ? null : (
              <Globe aria-hidden="true" className="size-4 sm:hidden" strokeWidth={2} />
            )}
            {code}
          </button>
        ))}
      </form>
    </div>
  );
}
