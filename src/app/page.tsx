import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HomeExperience } from "@/components/home/HomeExperience";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return <HomeExperience />;
}
