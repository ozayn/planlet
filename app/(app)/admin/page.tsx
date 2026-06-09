import { AdminUserStats } from "@/components/admin/admin-user-stats";
import { SummaryCard } from "@/components/insights/summary-card";
import { PageHeader } from "@/components/page-header";
import {
  getAdminEmails,
  getAllowedEmails,
} from "@/lib/auth-allowlist";
import { getAdminUserStats } from "@/lib/admin-stats";

function formatLoginTime(value: Date): string {
  return value.toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminPage() {
  const [{ users, totals, recentLogins }, allowedEmails, adminEmails] =
    await Promise.all([
      getAdminUserStats(),
      Promise.resolve(getAllowedEmails()),
      Promise.resolve(getAdminEmails()),
    ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Workspace access and usage counts. Plan contents are not shown here."
      />

      <article className="ui-card-padded space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Access configuration
        </h2>
        <p className="text-sm text-muted">
          For now, add or remove users by editing environment variables and
          redeploying. Database invite management is not available yet.
        </p>

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
        </div>
      </article>

      <div>
        <h2 className="ui-label mb-4">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Users" value={totals.userCount} accent="blue" />
          <SummaryCard label="Admins" value={totals.adminCount} accent="red" />
          <SummaryCard label="Plans" value={totals.planCount} accent="yellow" />
          <SummaryCard label="Items" value={totals.itemCount} accent="blue" />
          <SummaryCard
            label="Plan shares"
            value={totals.planShareCount}
            accent="red"
          />
        </div>
        <p className="mt-3 text-xs text-muted-light">
          Copy exports: {totals.shareExportCount} total clipboard exports saved.
        </p>
      </div>

      <article className="ui-card-padded">
        <h2 className="text-sm font-semibold text-foreground">Users</h2>
        <p className="mt-1 text-sm text-muted">
          Counts only — no plan titles, item text, or transcripts.
        </p>
        <div className="mt-4">
          <AdminUserStats users={users} />
        </div>
      </article>

      <article className="ui-card-padded">
        <h2 className="text-sm font-semibold text-foreground">Recent logins</h2>
        <p className="mt-1 text-sm text-muted">
          Last 25 sign-ins. Stores email, provider, and timestamp only — no IP
          addresses or plan content.
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
                  {formatLoginTime(event.createdAt)}
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
