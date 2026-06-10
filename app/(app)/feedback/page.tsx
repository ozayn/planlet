import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { MyFeedbackList } from "@/components/feedback/my-feedback-list";
import { PageHeader } from "@/components/page-header";
import { getMyFeedback } from "@/lib/feedback";
import { canGiveFeedback } from "@/lib/roles";

type FeedbackPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user || !canGiveFeedback(session.user)) {
    notFound();
  }

  const { from } = await searchParams;
  const pagePath = from?.startsWith("/") ? from : null;
  const items = await getMyFeedback(userId);

  return (
    <section className="ui-page-stack space-y-6">
      <PageHeader
        title="Feedback"
        subtitle="Ideas and notes for improving Planlet."
      />

      <article className="ui-card-padded space-y-3 border border-border-soft">
        <h2 className="text-sm font-medium text-foreground">Add feedback</h2>
        <FeedbackForm initialPagePath={pagePath} />
      </article>

      <article className="ui-card-padded space-y-3 border border-border-soft">
        <h2 className="text-sm font-medium text-foreground">My feedback</h2>
        <MyFeedbackList items={items} />
      </article>
    </section>
  );
}
