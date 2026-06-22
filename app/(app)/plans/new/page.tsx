import { auth } from "@/auth";
import { NewPlanFlow } from "@/components/plans/new-plan-flow";
import { PageHeader } from "@/components/page-header";
import { getThemeProjectCatalog } from "@/lib/themes-projects";

export default async function NewPlanPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const themeProjectCatalog = userId
    ? await getThemeProjectCatalog(userId)
    : { themes: [], projects: [] };

  return (
    <section>
      <PageHeader
        title="New plan"
        subtitle="Write, record, or import — then review and save."
      />
      <NewPlanFlow themeProjectCatalog={themeProjectCatalog} />
    </section>
  );
}
