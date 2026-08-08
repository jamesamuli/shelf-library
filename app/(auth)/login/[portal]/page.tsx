import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { LoginForm } from "../../_components/login-form";
import { PortalSwitch } from "../../_components/portal-switch";
import { isPortalSlug, PORTALS, safeRedirect } from "../../_lib/portals";
import { getSession, hasSignedInBefore } from "../../_lib/session";

export function generateStaticParams() {
  return Object.keys(PORTALS).map((portal) => ({ portal }));
}

export async function generateMetadata({
  params,
}: PageProps<"/login/[portal]">): Promise<Metadata> {
  const { portal } = await params;
  if (!isPortalSlug(portal)) return { title: "Connexion" };
  const messages = messagesFor(await getLocale());
  return { title: messages.portals[portal].name };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/login/[portal]">) {
  const { portal: slug } = await params;
  if (!isPortalSlug(slug)) notFound();

  const portal = PORTALS[slug];
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  // Legacy did the same check in index.php before rendering the form.
  if (await getSession(slug)) {
    redirect(safeRedirect(nextPath, portal.defaultRedirect));
  }

  const [messages, returning] = await Promise.all([
    getLocale().then(messagesFor),
    hasSignedInBefore(),
  ]);

  return (
    <div className="stack gap-content">
      <div className="stack gap-inline text-center">
        <h1 className="font-serif text-heading-2">
          {returning ? messages.welcomeBack : messages.welcome}
        </h1>
        <p className="text-body-sm text-foreground-muted">
          {messages.signInSubtitle}
        </p>
      </div>

      <PortalSwitch active={slug} messages={messages} />

      <LoginForm
        portal={portal}
        copy={messages.portals[slug]}
        messages={messages}
        next={nextPath}
      />

      <p className="text-center text-caption text-foreground-muted">
        {messages.noAccount}
      </p>
    </div>
  );
}
