import type { AdminUserStatRow } from "@/lib/admin-stats";
import { UserAvatar } from "@/components/user-avatar";
import { formatAdminRoleCapabilities } from "@/lib/admin-user-labels";
import {
  formatLastLoginLabel,
  formatRecentlySeenLabel,
} from "@/lib/user-seen";

type AdminUserStatsProps = {
  users: AdminUserStatRow[];
};

function AdminUserIdentity({ user }: { user: AdminUserStatRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar
        name={user.name}
        email={user.email}
        image={user.image}
        size="sm"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground" dir="auto">
          {user.name ?? "—"}
        </p>
        <p className="truncate text-xs text-muted" dir="auto">
          {user.email ?? "—"}
        </p>
      </div>
    </div>
  );
}

function RecentlySeenValue({ user }: { user: AdminUserStatRow }) {
  const seen = formatRecentlySeenLabel(user);
  return <span title={seen.title}>{seen.label}</span>;
}

function LastLoginValue({ user }: { user: AdminUserStatRow }) {
  const login = formatLastLoginLabel(user);
  return <span title={login.title}>{login.label}</span>;
}

export function AdminUserStats({ users }: AdminUserStatsProps) {
  if (users.length === 0) {
    return <p className="text-sm text-muted">No users yet.</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs text-muted">
              <th className="px-2 py-2 font-medium">User</th>
              <th className="px-2 py-2 font-medium">Role / capabilities</th>
              <th className="px-2 py-2 font-medium">Plans</th>
              <th
                className="px-2 py-2 font-medium"
                title="Last meaningful app action"
              >
                Last seen
              </th>
              <th
                className="px-2 py-2 font-medium"
                title="Last Google sign-in"
              >
                Last login
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border-soft/70 last:border-0"
              >
                <td className="px-2 py-2.5 align-top">
                  <AdminUserIdentity user={user} />
                </td>
                <td className="px-2 py-2.5 align-top text-xs text-muted">
                  {formatAdminRoleCapabilities(user)}
                </td>
                <td className="px-2 py-2.5 align-top text-foreground">
                  {user.planCount}
                </td>
                <td className="px-2 py-2.5 align-top text-xs text-muted">
                  <RecentlySeenValue user={user} />
                </td>
                <td className="px-2 py-2.5 align-top text-xs text-muted">
                  <LastLoginValue user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border-soft/70 md:hidden">
        {users.map((user) => {
          const seen = formatRecentlySeenLabel(user);
          const login = formatLastLoginLabel(user);

          return (
            <li key={user.id} className="py-3">
              <AdminUserIdentity user={user} />
              <p className="mt-1 text-xs text-muted">
                {formatAdminRoleCapabilities(user)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Plans {user.planCount} · Last seen {seen.label} · Last login{" "}
                {login.label}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
