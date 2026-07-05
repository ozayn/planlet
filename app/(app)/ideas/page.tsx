import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { IdeasPage } from "@/components/ideas/ideas-page";
import { PageHeader } from "@/components/page-header";
import { getIdeasPageData } from "@/lib/ideas";
import { canUseIdeasFeatures } from "@/lib/roles";

export default async function IdeasRoutePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canUseIdeasFeatures(session.user)) {
    notFound();
  }

  const data = await getIdeasPageData(userId);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Ideas"
        subtitle="Capture ideas before they disappear."
      />
      <IdeasPage data={data} />
    </section>
  );
}
