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
          ? "bg-teal-50 text-teal-900"
          : "bg-stone-100 text-stone-500"
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

      <article className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-800">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Name</dt>
            <dd className="text-end text-stone-800 bidi-isolate" dir="auto">
              {session?.user?.name ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Email</dt>
            <dd className="text-end text-stone-800 bidi-isolate" dir="auto">
              {session?.user?.email ?? "—"}
            </dd>
          </div>
        </dl>
      </article>

      <article className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-800">App</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">App name</dt>
            <dd className="text-stone-800">{PRODUCT.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Timezone</dt>
            <dd className="text-stone-800">{APP_TIMEZONE}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-stone-400">
          {PRODUCT.tagline}
        </p>
      </article>

      <article className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-800">Install</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          On mobile, use your browser&apos;s <strong>Add to Home Screen</strong>{" "}
          option to install {PRODUCT.name} as a PWA. Works best over HTTPS.
        </p>
        <p className="mt-2 text-xs text-stone-400">
          Theme color: {PWA.themeColor}
        </p>
      </article>

      <article className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-800">Features</h2>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-stone-600">Text parser provider</span>
            <span className="text-sm text-stone-800">{textParserProvider}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-stone-600">Text plan parsing</span>
            <StatusBadge
              enabled={textParserConfigured}
              label={textParserConfigured ? "Available" : "Not configured"}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-stone-600">OpenAI key configured</span>
            <StatusBadge
              enabled={openaiConfigured}
              label={openaiConfigured ? "Yes" : "No"}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-stone-600">Anthropic key configured</span>
            <StatusBadge
              enabled={anthropicConfigured}
              label={anthropicConfigured ? "Yes" : "No"}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-stone-600">Audio transcription</span>
            <StatusBadge
              enabled={openaiConfigured}
              label={openaiConfigured ? "OpenAI" : "Not configured"}
            />
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-stone-400">
          Text parsing uses{" "}
          <code className="text-stone-500">PLANLET_AI_PROVIDER</code> (
          {aiProvider}). Audio transcription always uses OpenAI.
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
