import { AdminCoachingReflectionLimitSetting } from "@/components/admin/admin-coaching-reflection-limit-setting";
import { AdminFeedbackSummary } from "@/components/admin/admin-feedback-summary";
import { AdminLifeLabDebug } from "@/components/admin/admin-life-lab-debug";
import { AdminRecentLogins } from "@/components/admin/admin-recent-logins";
import { AdminSummaryLine } from "@/components/admin/admin-summary-line";
import { AdminTechnicalInfo } from "@/components/admin/admin-technical-info";
import { AdminUserStats } from "@/components/admin/admin-user-stats";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/auth";
import {
  getAdminEmails,
  getAllowedEmails,
  getFeedbackEmails,
  getLifeLabEmails,
  getReflectorEmails,
} from "@/lib/auth-allowlist";
import { isAdminRole } from "@/lib/auth-roles";
import { getAdminUserStats } from "@/lib/admin-stats";
import {
  getTextParserProviderLabel,
  isImageExtractionConfigured,
  isOpenAIConfigured,
  isTextParserConfigured,
  isWebPushConfigured,
} from "@/lib/env";
import { getAdminFeedbackCounts } from "@/lib/feedback";
import { getCoachingReflectionWeeklyLimit } from "@/lib/app-settings";
import { canUseLifeLabFeatures } from "@/lib/roles";

export default async function AdminPage() {
  const session = await auth();
  const [
    { users, totals, recentLogins },
    allowedEmails,
    adminEmails,
    reflectorEmails,
    feedbackEmails,
    feedbackCounts,
    coachingReflectionWeeklyLimit,
    lifeLabEmails,
  ] = await Promise.all([
    getAdminUserStats(),
    Promise.resolve(getAllowedEmails()),
    Promise.resolve(getAdminEmails()),
    Promise.resolve(getReflectorEmails()),
    Promise.resolve(getFeedbackEmails()),
    getAdminFeedbackCounts(),
    getCoachingReflectionWeeklyLimit(),
    Promise.resolve(getLifeLabEmails()),
  ]);

  const textParserConfigured = isTextParserConfigured();
  const openaiConfigured = isOpenAIConfigured();
  const imageExtractionConfigured = isImageExtractionConfigured();

  return (
    <section className="space-y-5">
      <PageHeader
        title="Admin"
        subtitle="Planlet activity and users."
      />

      <AdminSummaryLine totals={totals} />

      <AdminFeedbackSummary
        openCount={feedbackCounts.openCount}
        highPriorityCount={feedbackCounts.highPriorityCount}
      />

      <section>
        <h2 className="ui-label mb-3">Users</h2>
        <AdminUserStats users={users} />
      </section>

      <section>
        <h2 className="ui-label mb-3">AI / Usage</h2>
        <AdminCoachingReflectionLimitSetting
          initialLimit={coachingReflectionWeeklyLimit}
        />
      </section>

      <div className="space-y-3 border-t border-border-soft pt-4">
        <AdminTechnicalInfo
          allowedEmails={allowedEmails}
          adminEmails={adminEmails}
          reflectorEmails={reflectorEmails}
          feedbackEmails={feedbackEmails}
          aiParsing={
            textParserConfigured
              ? `${getTextParserProviderLabel()} available`
              : "Not configured"
          }
          audioTranscription={
            openaiConfigured ? "Available" : "Not configured"
          }
          imageExtraction={
            imageExtractionConfigured ? "Available" : "Not configured"
          }
          pushNotifications={
            isWebPushConfigured() ? "Available" : "Not configured"
          }
        />
        <AdminLifeLabDebug
          signedInEmail={session?.user?.email}
          isAdmin={isAdminRole(session?.user?.role)}
          canUseLifeLabFeatures={canUseLifeLabFeatures(session?.user ?? {})}
          lifeLabEmails={lifeLabEmails}
        />
        <AdminRecentLogins logins={recentLogins} />
      </div>
    </section>
  );
}
