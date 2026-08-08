import { redirect } from "next/navigation";

// Nothing else is built yet, so the app opens on the sign-in screen.
// Replace with a real landing page when the portals have content.
export default function HomePage() {
  redirect("/login");
}
