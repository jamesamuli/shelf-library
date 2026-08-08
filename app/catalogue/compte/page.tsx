import { SessionPanel } from "../../(auth)/_components/session-panel";
import { requireSession } from "../../(auth)/_lib/session";

export default async function CataloguePage() {
  const session = await requireSession("opac");
  return <SessionPanel
      portal="opac"
      name={session.name}
      firstLogin={session.firstLogin}
    />;
}
