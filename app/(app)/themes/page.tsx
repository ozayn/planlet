import Link from "next/link";

import { auth } from "@/auth";
import { ManageThemesProjects } from "@/components/themes/manage-themes-projects";
import { PageHeader } from "@/components/page-header";
import { getThemeProjectCatalog } from "@/lib/themes-projects";

export default async function ThemesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const catalog = await getThemeProjectCatalog(userId, { includeArchived: true });

  return (
    <section className="ui-settings-page mx-auto max-w-lg space-y-5">
      <PageHeader
        title="Themes & projects"
        subtitle="Organize tasks by life area and ongoing effort."
      />

      <p className="text-sm text-muted">
        Assign themes and projects on task rows, or when reviewing imported plans.
      </p>

      <ManageThemesProjects catalog={catalog} />

      <p className="text-sm">
        <Link href="/settings" className="ui-text-link">
          Back to settings
        </Link>
      </p>
    </section>
  );
}
