import type { AdminUserStatRow } from "@/lib/admin-stats";
import { UserAvatar } from "@/components/user-avatar";
import { formatPlanActivityLabel } from "@/lib/plan-activity";
import { formatRecentlySeenLabel } from "@/lib/user-seen";

function formatLastPlanActivity(user: AdminUserStatRow): string {
  if (!user.lastPlanActivityAt) {
    return "—";
  }

  return formatPlanActivityLabel(user.lastPlanActivityAt);
}

type AdminUserStatsProps = {
  users: AdminUserStatRow[];
};

function RecentlySeenValue({ user }: { user: AdminUserStatRow }) {
  const seen = formatRecentlySeenLabel(user);
  return <span title={seen.title}>{seen.label}</span>;
}

function AdminUserIdentity({ user }: { user: AdminUserStatRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar
        name={user.name}
        email={user.email}
        image={user.image}
        size="sm"
      />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground" dir="auto">
          {user.name ?? "—"}
        </p>
        <p className="truncate text-xs text-muted" dir="auto">
          {user.email ?? "—"}
        </p>
      </div>
    </div>
  );
}

export function AdminUserStats({ users }: AdminUserStatsProps) {
  if (users.length === 0) {
    return <p className="text-sm text-muted">No users yet.</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs text-muted">
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Recently seen</th>
              <th className="px-3 py-2 font-medium">Recent plan activity</th>
              <th className="px-3 py-2 font-medium">Logins</th>
              <th className="px-3 py-2 font-medium">Plans</th>
              <th className="px-3 py-2 font-medium">Items</th>
              <th className="px-3 py-2 font-medium">Done</th>
              <th className="px-3 py-2 font-medium">Partial</th>
              <th className="px-3 py-2 font-medium">Moved</th>
              <th className="px-3 py-2 font-medium">Shares</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border-soft/70 last:border-0"
              >
                <td className="px-3 py-3 align-top">
                  <AdminUserIdentity user={user} />
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {user.role}
                </td>
                <td className="px-3 py-3 align-top text-muted">
                  <RecentlySeenValue user={user} />
                </td>
                <td className="px-3 py-3 align-top text-muted">
                  {formatLastPlanActivity(user)}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {user.loginCount}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {user.planCount}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {user.planItemCount}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {user.doneItemCount}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {user.partialItemCount}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {user.movedItemCount}
                </td>
                <td className="px-3 py-3 align-top text-xs text-muted">
                  <p>Out {user.sharedOutCount}</p>
                  <p>In {user.sharedWithMeCount}</p>
                  <p>Exports {user.shareExportCount}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {users.map((user) => (
          <li key={user.id} className="ui-card-padded space-y-3">
            <div className="flex items-start justify-between gap-3">
              <AdminUserIdentity user={user} />
              <span className="shrink-0 rounded-full bg-accent-cream px-2.5 py-1 text-xs font-medium text-foreground">
                {user.role}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">Recently seen</dt>
                <dd className="text-foreground">
                  <RecentlySeenValue user={user} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Recent plan activity</dt>
                <dd className="text-foreground">
                  {formatLastPlanActivity(user)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Login count</dt>
                <dd className="text-foreground">{user.loginCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Plans</dt>
                <dd className="text-foreground">{user.planCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Items</dt>
                <dd className="text-foreground">{user.planItemCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Done / partial / moved</dt>
                <dd className="text-foreground">
                  {user.doneItemCount} / {user.partialItemCount} /{" "}
                  {user.movedItemCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Shares</dt>
                <dd className="text-foreground">
                  Out {user.sharedOutCount} · In {user.sharedWithMeCount}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
