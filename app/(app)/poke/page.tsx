import { redirect } from "next/navigation";

export default async function PokeRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ nudge?: string }>;
}) {
  const params = await searchParams;

  if (params.nudge) {
    redirect(`/nudges?nudge=${params.nudge}`);
  }

  redirect("/nudges");
}
