import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { logout } from "../_actions/logout";
import type { PortalSlug } from "../_lib/portals";

/**
 * Minimal signed-in landing. Confirms who the session belongs to and offers
 * sign-out — the endpoint of the authentication loop, not the application
 * itself. Real portal content replaces this when those features are built.
 *
 * The greeting here is account-accurate: `firstLogin` comes from the account's
 * `last_login_at` being null at verification time, unlike the device-scoped
 * greeting on the login screen, which cannot know who you are yet.
 */
export async function SessionPanel({
  portal,
  name,
  firstLogin,
}: {
  portal: PortalSlug;
  name: string;
  firstLogin: boolean;
}) {
  const messages = messagesFor(await getLocale());
  const greeting = fill(
    firstLogin ? messages.greetingFirst : messages.greetingReturning,
    { name },
  );

  return (
    <main className="container-page flex flex-1 flex-col justify-center py-page-y">
      <div className="mx-auto w-full max-w-md stack gap-content rounded-panel border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-serif text-heading-2">{greeting}</h1>
        <p className="text-body-sm text-foreground-muted">
          {messages.portals[portal].name} — {messages.portals[portal].subtitle}
        </p>
        <form action={logout}>
          <input type="hidden" name="portal" value={portal} />
          <button
            type="submit"
            className="rounded-control border border-border px-4 py-2.5 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            {messages.signOut}
          </button>
        </form>
      </div>
    </main>
  );
}
