import Link from "next/link";
import { requireAdminUser } from "@/lib/admin-stats";
import { getJobCategories } from "@/lib/job-categories";
import { AdminJobCategories } from "@/components/admin/admin-job-categories";
export default async function JobCategoriesPage() {
  const user=await requireAdminUser();const categories=await getJobCategories(user.id);
  return <section className="mx-auto max-w-3xl space-y-5"><Link href="/admin" className="ui-text-link min-h-10">Back to Admin</Link><h1 className="text-xl font-medium">Job categories</h1><p className="text-sm text-muted">Manage categories for your applications. Rename updates your existing labels; retiring hides a suggestion while keeping historical records and chart counts. No deployment is needed for these edits.</p><AdminJobCategories initialCategories={categories}/></section>;
}
