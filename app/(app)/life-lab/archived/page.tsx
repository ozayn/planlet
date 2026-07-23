import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LifeLabArchivedPageContent } from "@/components/life-lab/life-lab-archived-page-content";
import { PageHeader } from "@/components/page-header";
import {
  getLifeLabBrowseData,
  getLifeLabFlashcardDecksData,
} from "@/lib/life-lab";
import { enrichArchivedLifeLabItems } from "@/lib/life-lab/archived-view";
import { LIFE_LAB_ALLOWED_SECTIONS } from "@/lib/life-lab/constants";
import { listArchivedLifeLabItems } from "@/lib/life-lab/item-state";
import { canAccessLifeLabPage } from "@/lib/roles";

export default async function LifeLabArchivedPage() {
  const session = await auth();

  if (!session?.user?.id || !canAccessLifeLabPage(session.user)) {
    notFound();
  }

  const [archived, { decks }, browseData] = await Promise.all([
    listArchivedLifeLabItems(session.user.id),
    getLifeLabFlashcardDecksData(),
    getLifeLabBrowseData(),
  ]);

  const items = enrichArchivedLifeLabItems({
    archived,
    decks,
    notes: browseData.notes,
  });

  const usedSections = new Set(items.map((item) => item.section));
  const sections = Object.entries(LIFE_LAB_ALLOWED_SECTIONS)
    .filter(([id]) => usedSections.has(id))
    .map(([id, value]) => ({ id, label: value.label }));

  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-4">
      <PageHeader
        title="Archived"
        subtitle="Items you archived in Planlet. Source files are unchanged."
        action={
          <Link
            href="/life-lab"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Back to Life Lab
          </Link>
        }
      />
      <LifeLabArchivedPageContent items={items} sections={sections} />
    </section>
  );
}
