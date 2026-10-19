import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LifeAreaSettings } from "@/components/settings/life-area-settings";
import { SettingsBackHeader } from "@/components/settings/settings-back-header";
import { SettingsShell } from "@/components/settings/settings-shell";
import { ensureDefaultLifeAreas } from "@/lib/life-areas";

export default async function LifeAreasPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  const areas = await ensureDefaultLifeAreas(userId);

  return (
    <SettingsShell>
      <SettingsBackHeader
        title="Life Areas"
        backHref="/settings/planner"
        backLabel="Planner"
      />
      <p className="mb-4 text-sm text-muted">
        Organize tasks by different parts of your life. Tasks can stay
        uncategorized.
      </p>
      <LifeAreaSettings areas={areas} />
    </SettingsShell>
  );
}
