import { redirect } from "next/navigation";

// The sign-in page shows every portal as a panel, so there is no chooser
// step. The reader panel opens by default: readers far outnumber staff, and
// it leads the stack, as in the CDI's reference.
export default function LoginIndexPage() {
  redirect("/login/opac");
}
