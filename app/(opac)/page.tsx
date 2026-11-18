import { getSession } from "@/app/(auth)/_lib/session";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { CatalogueHome } from "./_components/home";

/**
 * The app's front door is the public catalogue home (CDI request): readers
 * outnumber staff, and staff reach Gestion through the sign-in link.
 */
export default async function HomePage() {
  const [locale, session] = await Promise.all([getLocale(), getSession("opac")]);
  return (
    <CatalogueHome
      messages={messagesFor(locale)}
      locale={locale}
      isSubscriber={session !== null}
    />
  );
}
