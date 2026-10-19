import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { FocusPrioritySettings } from "@/components/settings/focus-priority-settings";
import { SettingsBackHeader } from "@/components/settings/settings-back-header";
import { SettingsShell } from "@/components/settings/settings-shell";
import { isAdminRole } from "@/lib/auth-roles";
import { ensureDefaultFocusPriorities } from "@/lib/focus-priorities";
import { ensureDefaultLifeAreas } from "@/lib/life-areas";

export default async function FocusPrioritiesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  if (!isAdminRole(session.user.role)) {
    notFound();
  }

  const [priorities, lifeAreas] = await Promise.all([
    ensureDefaultFocusPriorities(userId),
    ensureDefaultLifeAreas(userId),
  ]);

  return (
    <SettingsShell>
      <SettingsBackHeader
        title="Focus Priorities"
        backHref="/settings/planner"
        backLabel="Planner"
      />
      <p className="mb-4 text-sm text-muted">
        Ongoing priorities to keep in view. They are suggestions only — not
        tasks.
      </p>
      <FocusPrioritySettings
        priorities={priorities}
        lifeAreas={lifeAreas.filter((area) => !area.archivedAt)}
      />
    </SettingsShell>
  );
}
