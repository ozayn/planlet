import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { PRODUCT, PWA } from "@/config/product";
import { APP_TIMEZONE } from "@/config/time";
import {
  getAnthropicModel,
  getOpenAITranscribeModel,
  getPlanletAiProvider,
  getTextParserProviderLabel,
  isAnthropicConfigured,
  isOpenAIConfigured,
  isTextParserConfigured,
} from "@/lib/env";

function StatusBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-medium ${
        enabled
          ? "bg-accent-cream text-foreground"
          : "bg-border-soft text-muted"
      }`}
    >
      {label}
    </span>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  const openaiConfigured = isOpenAIConfigured();
  const anthropicConfigured = isAnthropicConfigured();
  const textParserConfigured = isTextParserConfigured();
  const textParserProvider = getTextParserProviderLabel();
  const aiProvider = getPlanletAiProvider();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Account and app information."
      />

      <article className="ui-card-padded">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd className="text-end text-foreground bidi-isolate" dir="auto">
              {session?.user?.name ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="text-end text-foreground bidi-isolate" dir="auto">
              {session?.user?.email ?? "—"}
            </dd>
          </div>
        </dl>
      </article>

      <article className="ui-card-padded">
        <h2 className="text-sm font-semibold text-foreground">App</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">App name</dt>
            <dd className="text-foreground">{PRODUCT.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Timezone</dt>
            <dd className="text-foreground">{APP_TIMEZONE}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted-light">
          {PRODUCT.tagline}
        </p>
      </article>

      <article className="ui-card-padded">
        <h2 className="text-sm font-semibold text-foreground">Install</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          On mobile, use your browser&apos;s <strong>Add to Home Screen</strong>{" "}
          option to install {PRODUCT.name} as a PWA. Works best over HTTPS.
        </p>
        <p className="mt-2 text-xs text-muted-light">
          Theme color: {PWA.themeColor}
        </p>
      </article>

      <article className="ui-card-padded">
        <h2 className="text-sm font-semibold text-foreground">Features</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted">Text parser provider</span>
            <span className="text-sm font-medium text-foreground">
              {textParserProvider}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted">Text plan parsing</span>
            <StatusBadge
              enabled={textParserConfigured}
              label={textParserConfigured ? "Available" : "Not configured"}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted">OpenAI key configured</span>
            <StatusBadge
              enabled={openaiConfigured}
              label={openaiConfigured ? "Yes" : "No"}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted">Anthropic key configured</span>
            <StatusBadge
              enabled={anthropicConfigured}
              label={anthropicConfigured ? "Yes" : "No"}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted">Audio transcription</span>
            <StatusBadge
              enabled={openaiConfigured}
              label={openaiConfigured ? "OpenAI" : "Not configured"}
            />
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-light">
          Text parsing uses{" "}
          <code className="text-muted">PLANLET_AI_PROVIDER</code> ({aiProvider}).
          Audio transcription always uses OpenAI.
          {aiProvider === "anthropic"
            ? anthropicConfigured
              ? ` Parser model: ${getAnthropicModel()}.`
              : " Set ANTHROPIC_API_KEY to enable Structure plan."
            : openaiConfigured
              ? " OpenAI key is configured for Structure plan."
              : " Set OPENAI_API_KEY to enable Structure plan."}
          {openaiConfigured
            ? ` Transcription model: ${getOpenAITranscribeModel()}.`
            : " Set OPENAI_API_KEY to enable Transcribe on New plan."}
        </p>
      </article>

      <SignOutButton />
    </section>
  );
}
