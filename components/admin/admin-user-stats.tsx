import type { AdminAiFeatureUsage, AdminUserStatRow } from "@/lib/admin-stats";
import { UserAvatar } from "@/components/user-avatar";
import { formatAdminRoleCapabilities } from "@/lib/admin-user-labels";
import {
  formatCompactNumber,
  formatExactNumber,
} from "@/lib/number-format";
import {
  formatLastLoginLabel,
  formatRecentlySeenLabel,
} from "@/lib/user-seen";

type AdminUserStatsProps = {
  users: AdminUserStatRow[];
};

function AdminCompactCount({
  value,
  unit,
}: {
  value: number;
  unit: string;
}) {
  return (
    <span
      title={`${formatExactNumber(value)} ${unit}`}
      className="tabular-nums"
    >
      {formatCompactNumber(value)}
    </span>
  );
}

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

function AdminAiFeatureBreakdown({
  usage,
}: {
  usage: AdminAiFeatureUsage[];
}) {
  if (usage.length === 0) {
    return (
      <p className="text-xs text-muted">No AI usage recorded for this user.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead>
          <tr className="text-muted">
            <th className="py-1 pr-3 font-medium">Feature</th>
            <th className="py-1 pr-3 font-medium">Tokens (month)</th>
            <th className="py-1 pr-3 font-medium">Tokens (total)</th>
            <th className="py-1 pr-3 font-medium">Calls (month)</th>
            <th className="py-1 font-medium">Calls (total)</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((row) => (
            <tr key={row.feature} className="text-foreground">
              <td className="py-1 pr-3">{row.label}</td>
              <td className="py-1 pr-3 tabular-nums">
                <AdminCompactCount
                  value={row.tokensThisMonth}
                  unit="tokens"
                />
              </td>
              <td className="py-1 pr-3 tabular-nums">
                <AdminCompactCount value={row.tokensTotal} unit="tokens" />
              </td>
              <td className="py-1 pr-3 tabular-nums">
                <AdminCompactCount value={row.callsThisMonth} unit="calls" />
              </td>
              <td className="py-1 tabular-nums">
                <AdminCompactCount value={row.callsTotal} unit="calls" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminAiUsageBreakdownDetails({
  user,
}: {
  user: AdminUserStatRow;
}) {
  if (user.aiUsageByFeature.length === 0) {
    return null;
  }

  return (
    <details className="group mt-1">
      <summary className="cursor-pointer list-none text-xs text-accent [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Feature breakdown</span>
        <span className="hidden group-open:inline">Hide breakdown</span>
      </summary>
      <div className="mt-2 rounded-lg border border-border-soft/70 bg-surface-muted/40 p-2.5">
        <AdminAiFeatureBreakdown usage={user.aiUsageByFeature} />
      </div>
    </details>
  );
}

export function AdminUserStats({ users }: AdminUserStatsProps) {
  if (users.length === 0) {
    return <p className="text-sm text-muted">No users yet.</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs text-muted">
              <th className="px-2 py-2 font-medium">User</th>
              <th className="px-2 py-2 font-medium">Role / capabilities</th>
              <th className="px-2 py-2 font-medium">Plans</th>
              <th className="px-2 py-2 font-medium">AI tokens (month)</th>
              <th className="px-2 py-2 font-medium">AI tokens (total)</th>
              <th className="px-2 py-2 font-medium">AI calls (month)</th>
              <th className="px-2 py-2 font-medium">AI calls (total)</th>
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
                  <AdminAiUsageBreakdownDetails user={user} />
                </td>
                <td className="px-2 py-2.5 align-top text-xs text-muted">
                  {formatAdminRoleCapabilities(user)}
                </td>
                <td className="px-2 py-2.5 align-top text-foreground tabular-nums">
                  {user.planCount}
                </td>
                <td className="px-2 py-2.5 align-top text-foreground tabular-nums">
                  <AdminCompactCount
                    value={user.aiTokensThisMonth}
                    unit="tokens"
                  />
                </td>
                <td className="px-2 py-2.5 align-top text-foreground tabular-nums">
                  <AdminCompactCount
                    value={user.aiTokensTotal}
                    unit="tokens"
                  />
                </td>
                <td className="px-2 py-2.5 align-top text-foreground tabular-nums">
                  <AdminCompactCount
                    value={user.aiCallsThisMonth}
                    unit="calls"
                  />
                </td>
                <td className="px-2 py-2.5 align-top text-foreground tabular-nums">
                  <AdminCompactCount value={user.aiCallsTotal} unit="calls" />
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
                Plans {user.planCount} · AI tokens (month){" "}
                <AdminCompactCount
                  value={user.aiTokensThisMonth}
                  unit="tokens"
                />{" "}
                · AI tokens (total){" "}
                <AdminCompactCount value={user.aiTokensTotal} unit="tokens" />{" "}
                · AI calls (month){" "}
                <AdminCompactCount
                  value={user.aiCallsThisMonth}
                  unit="calls"
                />{" "}
                · AI calls (total){" "}
                <AdminCompactCount value={user.aiCallsTotal} unit="calls" /> ·
                Last seen {seen.label} · Last login {login.label}
              </p>
              {user.aiUsageByFeature.length > 0 && (
                <div className="mt-2">
                  <AdminAiFeatureBreakdown usage={user.aiUsageByFeature} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
