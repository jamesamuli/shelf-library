import { redirect } from "next/navigation";

// The portal toggle now lives on the login screen itself, so a separate
// chooser step is redundant. Gestion is the default, as in the login mockup.
export default function LoginIndexPage() {
  redirect("/login/gestion");
}
