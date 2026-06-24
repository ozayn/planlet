import { AdminCoachingReflectionLimitSetting } from "@/components/admin/admin-coaching-reflection-limit-setting";
import { AdminFeedbackSummary } from "@/components/admin/admin-feedback-summary";
import { AdminRecentLogins } from "@/components/admin/admin-recent-logins";
import { AdminSummaryLine } from "@/components/admin/admin-summary-line";
import { AdminTechnicalInfo } from "@/components/admin/admin-technical-info";
import { AdminUserStats } from "@/components/admin/admin-user-stats";
import { PageHeader } from "@/components/page-header";
import {
  getAdminEmails,
  getAllowedEmails,
  getFeedbackEmails,
  getReflectorEmails,
} from "@/lib/auth-allowlist";
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

export default async function AdminPage() {
  const [
    { users, totals, recentLogins },
    allowedEmails,
    adminEmails,
    reflectorEmails,
    feedbackEmails,
    feedbackCounts,
    coachingReflectionWeeklyLimit,
  ] = await Promise.all([
    getAdminUserStats(),
    Promise.resolve(getAllowedEmails()),
    Promise.resolve(getAdminEmails()),
    Promise.resolve(getReflectorEmails()),
    Promise.resolve(getFeedbackEmails()),
    getAdminFeedbackCounts(),
    getCoachingReflectionWeeklyLimit(),
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
        <AdminRecentLogins logins={recentLogins} />
      </div>
    </section>
  );
}
