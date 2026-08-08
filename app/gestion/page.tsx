import { SessionPanel } from "../(auth)/_components/session-panel";
import { requireSession } from "../(auth)/_lib/session";

export default async function GestionPage() {
  const session = await requireSession("gestion");
  return <SessionPanel
      portal="gestion"
      name={session.name}
      firstLogin={session.firstLogin}
    />;
}
