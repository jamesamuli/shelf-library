import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { isPortalSlug } from "../../../_lib/portals";

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesFor(await getLocale());
  return { title: messages.forgotTitle };
}

/**
 * No self-service reset yet: legacy sent a reset mail (`askmdp.php`) and this
 * app has no mail transport. Rather than link to nothing from the login form,
 * this says who to contact. Replace when mail sending exists.
 */
export default async function ForgottenPasswordPage({
  params,
}: PageProps<"/login/[portal]/mot-de-passe-oublie">) {
  const { portal: slug } = await params;
  if (!isPortalSlug(slug)) notFound();

  const messages = messagesFor(await getLocale());

  return (
    <div className="stack gap-content">
      <div className="stack gap-inline text-center">
        <h1 className="font-serif text-heading-3">{messages.forgotTitle}</h1>
        <p className="text-body-sm text-foreground-muted">
          {slug === "gestion" ? messages.forgotGestion : messages.forgotOpac}
        </p>
      </div>

      <Link
        href={`/login/${slug}`}
        className="rounded-control border border-border px-4 py-2.5 text-center text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        {messages.backToSignIn} — {messages.portals[slug].name}
      </Link>
    </div>
  );
}
