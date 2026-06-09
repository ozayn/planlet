import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import {
  getAdminEmails,
  getAllowedEmails,
} from "@/lib/auth-allowlist";
import { isAdminRole } from "@/lib/auth-roles";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    notFound();
  }

  const [users, allowedEmails, adminEmails] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    Promise.resolve(getAllowedEmails()),
    Promise.resolve(getAdminEmails()),
  ]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Private workspace access overview."
      />

      <article className="ui-card-padded space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Access control</h2>
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

      <article className="ui-card-padded">
        <h2 className="text-sm font-semibold text-foreground">
          Signed-in users
        </h2>
        <p className="mt-1 text-sm text-muted">
          {users.length} user{users.length === 1 ? "" : "s"} in the database.
        </p>

        {users.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="rounded-xl bg-accent-cream/40 px-4 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground" dir="auto">
                      {user.name ?? "—"}
                    </p>
                    <p className="text-muted" dir="auto">
                      {user.email ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                    {user.role}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-light">
                  Joined {user.createdAt.toLocaleDateString("en")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">No users yet.</p>
        )}
      </article>
    </section>
  );
}
