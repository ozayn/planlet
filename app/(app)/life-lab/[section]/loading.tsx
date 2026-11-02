import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function LifeLabSectionLoading() {
  return (
    <section className="ui-life-lab-surface ui-page-stack space-y-6" aria-busy="true">
      <PageHeader
        title="Life Lab"
        subtitle="Loading notes…"
        action={
          <Link href="/life-lab" className="text-sm font-medium text-muted hover:text-foreground">
            Back to Life Lab
          </Link>
        }
      />
      <p role="status" className="text-sm text-muted">Loading your library…</p>
    </section>
  );
}
