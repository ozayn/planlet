import { auth } from "@/auth";
import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { PageHeader } from "@/components/page-header";
import { PlanItemViewSettings } from "@/components/settings/plan-item-view-settings";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { PRODUCT } from "@/config/product";
import { APP_TIMEZONE } from "@/config/time";
import {
  isImageExtractionConfigured,
  isOpenAIConfigured,
  isTextParserConfigured,
} from "@/lib/env";
import { getPlanItemViewForUser } from "@/lib/user-preferences";

export default async function SettingsPage() {
  const session = await auth();
  const textParserConfigured = isTextParserConfigured();
  const openaiConfigured = isOpenAIConfigured();
  const imageExtractionConfigured = isImageExtractionConfigured();
  const planItemView = session?.user?.id
    ? await getPlanItemViewForUser(session.user.id)
    : "CHECKLIST";

  return (
    <section className="space-y-4">
      <PageHeader title="Settings" subtitle="Profile and app information." />

      <article className="ui-card-padded">
        <h2 className="ui-section-title">Profile</h2>

        <div className="mt-4 flex items-center gap-4">
          <UserAvatar
            name={session?.user?.name}
            email={session?.user?.email}
            image={session?.user?.image}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground" dir="auto">
              {session?.user?.name ?? "Signed in"}
            </p>
            {session?.user?.email ? (
              <p className="mt-0.5 text-sm text-muted" dir="auto">
                {session.user.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 border-t border-border-soft pt-5">
          <SignOutButton className="w-full" />
        </div>
      </article>

      <article className="ui-card-padded">
        <ThemeToggle variant="full" />
        <p className="mt-3 text-xs text-muted-light">
          You can also change this from the navigation bar.
        </p>
      </article>

      <article className="ui-card-padded">
        <PushNotificationSettings />
      </article>

      <article className="ui-card-padded">
        <PlanItemViewSettings value={planItemView} />
      </article>

      <article className="ui-card-padded">
        <h2 className="ui-section-title">App</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd className="text-foreground">{PRODUCT.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Timezone</dt>
            <dd className="text-foreground">{APP_TIMEZONE}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">AI parsing</dt>
            <dd className="text-foreground">
              {textParserConfigured ? "Available" : "Not configured"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Audio transcription</dt>
            <dd className="text-foreground">
              {openaiConfigured ? "Available" : "Not configured"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Image text extraction</dt>
            <dd className="text-foreground">
              {imageExtractionConfigured ? "Available" : "Not configured"}
            </dd>
          </div>
        </dl>
      </article>

      <article className="ui-card-padded">
        <h2 className="ui-section-title">Install</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          On mobile, use your browser&apos;s Add to Home Screen option to
          install {PRODUCT.name}. Works best over HTTPS.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          On iPhone, install Planlet to your Home Screen before enabling phone
          notifications.
        </p>
        <p className="mt-2 text-xs text-muted-light">
          Browser theme color follows your Day or Night choice.
        </p>
      </article>
    </section>
  );
}
