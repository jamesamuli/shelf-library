import type { Metadata } from "next";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { PERMISSIONS } from "@/lib/permissions";
import { listRoles, listStaff } from "@/lib/staff";
import { getStaffContext } from "../../(auth)/_lib/session";
import { Denied } from "../_components/denied";
import { StaffTable } from "./_components/staff-table";

export const metadata: Metadata = { title: "Personnel" };

export default async function StaffPage() {
  const [locale, { granted }] = await Promise.all([
    getLocale(),
    getStaffContext(),
  ]);
  const messages = messagesFor(locale);

  if (!granted.has("staff.manage")) return <Denied messages={messages} />;

  const [staff, roles] = await Promise.all([listStaff(), listRoles()]);
  const s = messages.staff;

  return (
    <div className="stack gap-section">
      <header className="stack gap-inline">
        <h1 className="font-serif text-heading-1">{s.title}</h1>
        <p className="text-body text-foreground-muted">{s.intro}</p>
      </header>

      <StaffTable staff={staff} roles={roles} messages={messages} />

      <section className="stack gap-content rounded-card border border-border bg-surface p-4 sm:p-6">
        <div className="stack gap-1">
          <h2 className="font-serif text-heading-3">{s.rolesTitle}</h2>
          <p className="text-caption text-foreground-muted">{s.rolesIntro}</p>
        </div>
        <dl className="stack gap-content">
          {roles.map((role) => (
            <div key={role.id} className="stack gap-1 border-t border-border pt-3">
              <dt className="text-body-sm font-medium">{role.name}</dt>
              <dd className="stack gap-1">
                {role.description ? (
                  <p className="text-caption text-foreground-muted">
                    {role.description}
                  </p>
                ) : null}
                <ul className="stack gap-0.5 text-caption text-foreground-subtle">
                  {role.permissions.map((permission) => (
                    <li key={permission}>{PERMISSIONS[permission]}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
