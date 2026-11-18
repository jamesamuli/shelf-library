import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { GraduationCap, UserCog, type LucideIcon } from "lucide-react";
import { messagesFor, type Messages } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { GoogleButton } from "../../_components/google-button";
import { LoginForm } from "../../_components/login-form";
import { LoginSwitch } from "../../_components/login-switch";
import { googleConfig, isGoogleFailure } from "../../_lib/google";
import {
  isPortalSlug,
  PORTAL_SLUGS,
  PORTALS,
  safeRedirect,
  type PortalSlug,
} from "../../_lib/portals";
import { getSession } from "../../_lib/session";

export function generateStaticParams() {
  return PORTAL_SLUGS.map((portal) => ({ portal }));
}

export async function generateMetadata({
  params,
}: PageProps<"/login/[portal]">): Promise<Metadata> {
  const { portal } = await params;
  if (!isPortalSlug(portal)) return { title: "Connexion" };
  const messages = messagesFor(await getLocale());
  return { title: messages.portals[portal].name };
}

/** The card's left block: who signs in here, as a picture and a few words. */
const AUDIENCE: Record<PortalSlug, { Icon: LucideIcon; tone: string; edge: string }> = {
  opac: { Icon: GraduationCap, tone: "bg-accent text-primary-foreground", edge: "border-accent" },
  gestion: { Icon: UserCog, tone: "bg-primary text-primary-foreground", edge: "border-primary" },
};

function SignInCard({
  slug,
  messages,
  children,
}: {
  slug: PortalSlug;
  messages: Messages;
  children: React.ReactNode;
}) {
  const { Icon, tone, edge } = AUDIENCE[slug];
  const copy = messages.portals[slug];
  return (
    <section
      aria-labelledby={`signin-${slug}`}
      className={`grid overflow-hidden rounded-card border-2 bg-surface shadow-card sm:grid-cols-[8rem_minmax(0,1fr)] ${edge}`}
    >
      {/* On phones a full-width band with the icon over the label — the
          tabs having gone to the bottom bar, the card has the screen. */}
      <div
        className={`stack items-center justify-center gap-2 px-4 py-6 text-center sm:px-2 sm:py-5 ${tone}`}
      >
        <Icon aria-hidden="true" className="size-14 shrink-0 sm:size-16" strokeWidth={1.5} />
        <span className="font-heading text-body font-semibold leading-tight">{copy.audience}</span>
      </div>
      <div className="stack gap-content p-5">
        <div className="stack gap-1">
          {/* Both cards say "Se connecter"; the hidden half tells a screen
              reader's heading list which is which. */}
          <h2 id={`signin-${slug}`} className="font-heading text-heading-2">
            {messages.signIn}
            <span className="sr-only"> — {copy.audience}</span>
          </h2>
          <p className="text-body-sm text-foreground-muted">{copy.signInHint}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

/**
 * Two ways in, one showing at a time behind a switch: readers (students and
 * teachers) with their school Google account, staff with a username and
 * password. The URL's portal picks the card shown first, which card a
 * `?next=` belongs to, whose session sends you straight on, and where the
 * cursor starts.
 */
export default async function LoginPage({ params, searchParams }: PageProps<"/login/[portal]">) {
  const { portal: slug } = await params;
  if (!isPortalSlug(slug)) notFound();

  const { next, google } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  // Legacy did the same check in index.php before rendering the form.
  if (await getSession(slug)) {
    redirect(safeRedirect(nextPath, PORTALS[slug].defaultRedirect));
  }

  const messages = messagesFor(await getLocale());
  const googleReady = googleConfig() !== null;
  // Set by the Google callback when it turns a sign-in back. Without the
  // Google credentials readers have no way in at all, so that is said
  // outright rather than leaving the card without a button.
  const googleError = !googleReady
    ? messages.google.errors.unavailable
    : isGoogleFailure(google)
      ? messages.google.errors[google]
      : null;

  const cards = Object.fromEntries(
    PORTAL_SLUGS.map((other) => [
      other,
      <SignInCard key={other} slug={other} messages={messages}>
        {other === "opac" ? (
          <>
            {googleError ? (
              <p
                role="alert"
                className="rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger"
              >
                {googleError}
              </p>
            ) : null}
            {googleReady ? (
              <GoogleButton
                label={messages.google.signIn}
                pendingLabel={messages.signingIn}
                next={slug === "opac" ? nextPath : undefined}
              />
            ) : null}
          </>
        ) : (
          <LoginForm
            messages={messages}
            next={slug === "gestion" ? nextPath : undefined}
            autoFocus={slug === "gestion"}
          />
        )}
      </SignInCard>,
    ]),
  ) as Record<PortalSlug, React.ReactNode>;

  return (
    // Room at the foot on phones, so the bottom bar never covers the form.
    <div className="mx-auto stack w-full max-w-3xl gap-section max-sm:pb-24">
      {/* Built like the home page's welcome: two lines, the school's name in
          Shelf teal capitals — same string, so the two never drift apart. The
          hidden dash keeps the lines apart in the heading's spoken name. Not
          shown on phones (CDI request), as on the home, but kept for screen
          readers: a page still needs its main heading. */}
      <h1 className="stack text-balance text-center font-heading text-heading-2 max-sm:sr-only sm:text-display">
        <span>{messages.signInTitle}</span>
        <span className="sr-only"> — </span>
        <span className="uppercase text-accent">{messages.catalogue.welcomeSchool}</span>
      </h1>

      <LoginSwitch
        home={{ href: "/", label: messages.home }}
        initial={slug}
        order={PORTAL_SLUGS}
        label={messages.signInChoice}
        labels={{
          opac: messages.portals.opac.audience,
          gestion: messages.portals.gestion.audience,
        }}
        panels={cards}
      />

      <p className="text-center text-body-sm text-foreground-muted">{messages.noAccount}</p>
    </div>
  );
}
