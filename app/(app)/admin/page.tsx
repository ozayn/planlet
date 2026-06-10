import Link from "next/link";

import { AdminUserStats } from "@/components/admin/admin-user-stats";
import { SummaryCard } from "@/components/insights/summary-card";
import { PageHeader } from "@/components/page-header";
import {
  getAdminEmails,
  getAllowedEmails,
  getFeedbackEmails,
  getReflectorEmails,
} from "@/lib/auth-allowlist";
import { getAdminUserStats } from "@/lib/admin-stats";
import { formatAdminDateTime } from "@/lib/dates";
import { getAdminFeedbackCounts } from "@/lib/feedback";

export default async function AdminPage() {
  const [
    { users, totals, recentLogins },
    allowedEmails,
    adminEmails,
    reflectorEmails,
    feedbackEmails,
    feedbackCounts,
  ] = await Promise.all([
    getAdminUserStats(),
    Promise.resolve(getAllowedEmails()),
    Promise.resolve(getAdminEmails()),
    Promise.resolve(getReflectorEmails()),
    Promise.resolve(getFeedbackEmails()),
    getAdminFeedbackCounts(),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Workspace access and usage counts. No plan contents shown."
      />

      <article className="ui-card-padded space-y-4 border border-border-soft">
        <h2 className="ui-section-title">Access configuration</h2>

        <div className="space-y-3 text-sm">
          <div>
            <p className="ui-label mb-2">Allowed emails</p>
            {allowedEmails.length > 0 ? (
              <ul className="space-y-1 text-foreground">
                {allowedEmails.map((email) => (
                  <li key={email} dir="auto">
                    {email}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                ALLOWED_EMAILS is empty — all Google sign-ins are allowed.
              </p>
            )}
          </div>

          <div>
            <p className="ui-label mb-2">Admin emails</p>
            {adminEmails.length > 0 ? (
              <ul className="space-y-1 text-foreground">
                {adminEmails.map((email) => (
                  <li key={email} dir="auto">
                    {email}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No PLANLET_ADMIN_EMAILS configured.</p>
            )}
          </div>

          <div>
            <p className="ui-label mb-2">Reflector emails</p>
            {reflectorEmails.length > 0 ? (
              <ul className="space-y-1 text-foreground">
                {reflectorEmails.map((email) => (
                  <li key={email} dir="auto">
                    {email}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                No PLANLET_REFLECTOR_EMAILS configured.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-light">
              Reflector users can access private observations and gratitude.
            </p>
          </div>

          <div>
            <p className="ui-label mb-2">Feedback emails</p>
            {feedbackEmails.length > 0 ? (
              <ul className="space-y-1 text-foreground">
                {feedbackEmails.map((email) => (
                  <li key={email} dir="auto">
                    {email}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                No PLANLET_FEEDBACK_EMAILS configured.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-light">
              Feedback users can leave product improvement notes in Planlet.
            </p>
          </div>
        </div>
      </article>

      <Link
        href="/admin/feedback"
        className="ui-card-padded flex items-center justify-between gap-3 border border-border-soft transition-colors hover:bg-accent-cream/25"
      >
        <div>
          <p className="text-sm font-medium text-foreground">Feedback</p>
          <p className="text-xs text-muted">
            Open: {feedbackCounts.openCount} · High priority:{" "}
            {feedbackCounts.highPriorityCount}
          </p>
        </div>
        <span className="text-sm text-muted">View</span>
      </Link>

      <div>
        <h2 className="ui-label mb-4">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Users" value={totals.userCount} accent="blue" />
          <SummaryCard label="Admins" value={totals.adminCount} accent="red" />
          <SummaryCard
            label="Reflectors"
            value={totals.reflectorCount}
            accent="yellow"
          />
          <SummaryCard label="Plans" value={totals.planCount} accent="yellow" />
          <SummaryCard label="Items" value={totals.itemCount} accent="blue" />
          <SummaryCard
            label="Plan shares"
            value={totals.planShareCount}
            accent="red"
          />
        </div>
        <p className="mt-3 text-xs text-muted-light">
          Copy as text exports: {totals.shareExportCount}
        </p>
      </div>

      <article className="ui-card-padded border border-border-soft">
        <h2 className="ui-section-title">Users</h2>
        <div className="mt-4">
          <AdminUserStats users={users} />
        </div>
      </article>

      <article className="ui-card-padded border border-border-soft">
        <h2 className="ui-section-title">Recent logins</h2>
        <p className="mt-1 text-sm text-muted">
          Last 25 sign-ins — email, provider, and time only.
        </p>

        {recentLogins.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {recentLogins.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-1 rounded-xl bg-accent-cream/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-foreground" dir="auto">
                  {event.email}
                </span>
                <span className="text-muted">
                  {formatAdminDateTime(event.createdAt)}
                  {event.provider ? ` · ${event.provider}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">No login events yet.</p>
        )}
      </article>
    </section>
  );
}
