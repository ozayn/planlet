import type { AdminLoginEventRow } from "@/lib/admin-stats";
import { formatAdminDateTime } from "@/lib/dates";

type AdminRecentLoginsProps = {
  logins: AdminLoginEventRow[];
};

export function AdminRecentLogins({ logins }: AdminRecentLoginsProps) {
  return (
    <details className="ui-settings-details group">
      <summary className="ui-settings-details-summary">
        Recent logins
      </summary>
      <div className="ui-settings-details-body">
        {logins.length > 0 ? (
          <ul className="divide-y divide-border-soft/70">
            {logins.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-0.5 py-2 text-sm first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-foreground" dir="auto">
                  {event.email}
                </span>
                <span className="text-xs text-muted">
                  {formatAdminDateTime(event.createdAt)}
                  {event.provider ? ` · ${event.provider}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No login events yet.</p>
        )}
      </div>
    </details>
  );
}
