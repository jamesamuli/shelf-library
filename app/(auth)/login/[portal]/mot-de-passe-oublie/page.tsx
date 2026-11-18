import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await getLocale());
  return { title: messages.forgotTitle };
}

/**
 * No self-service reset yet: legacy sent a reset mail (`askmdp.php`) and this
 * app has no mail transport. Rather than link to nothing from the login form,
 * this says who to contact. Replace when mail sending exists.
 *
 * Staff only: readers sign in with Google and have no password to forget.
 */
export default async function ForgottenPasswordPage({
  params,
}: PageProps<"/login/[portal]/mot-de-passe-oublie">) {
  const { portal: slug } = await params;
  if (slug !== "gestion") notFound();

  const messages = messagesFor(await getLocale());

  return (
    <div className="stack max-w-2xl gap-content rounded-card border-2 border-primary bg-accent/10 p-5 sm:p-7">
      <div className="stack gap-inline">
        <h1 className="font-heading text-heading-2 text-primary">{messages.forgotTitle}</h1>
        <p className="text-body text-foreground-muted">
          {messages.forgotGestion}
        </p>
      </div>

      <Link
        href="/login/gestion"
        className="self-start rounded-control border-2 border-primary bg-surface px-4 py-2.5 text-body-sm font-medium outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        {messages.backToSignIn} — {messages.portals.gestion.name}
      </Link>
    </div>
  );
}
