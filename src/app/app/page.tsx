import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function AppPage() {
  const user = await getCurrentUser();
  if (!user) {
    // Clear stale JWT cookies via route handler (can't delete cookies in a page render)
    redirect("/api/auth/clear?next=/app");
  }

  return <AppShell user={user} />;
}
