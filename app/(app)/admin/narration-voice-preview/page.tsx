import Link from "next/link";

import { AdminNarrationVoicePreview } from "@/components/admin/admin-narration-voice-preview";
import { PageHeader } from "@/components/page-header";
import { requireAdminUser } from "@/lib/admin-stats";
import {
  getOpenAiTtsConfigurationStatus,
  isLifeLabOpenAiTtsEnabled,
} from "@/lib/env";
import { NARRATION_INSTRUCTION_VERSION } from "@/lib/life-lab/narration-config";

export default async function AdminNarrationVoicePreviewPage() {
  await requireAdminUser();

  const ttsStatus = getOpenAiTtsConfigurationStatus();

  return (
    <section className="space-y-5">
      <PageHeader
        title="Voice preview"
        subtitle="Compare OpenAI narration voices and styles without cache. Accent is best-effort."
      />

      <div className="space-y-2 rounded-xl border border-border/70 px-3 py-3 text-xs text-muted">
        <p>
          <span className="font-medium text-foreground">Runtime:</span>{" "}
          {isLifeLabOpenAiTtsEnabled() ? "OpenAI TTS enabled" : "OpenAI TTS disabled"}
          {" · "}
          model {ttsStatus.model}
          {" · "}
          env default voice {ttsStatus.voice}
          {" · "}
          instruction version {NARRATION_INSTRUCTION_VERSION}
        </p>
        <p>
          Prefer Settings → Voice & Audio → Preview voices when choosing a
          personal OpenAI voice. British pronunciation requests are best-effort
          and vary by model/voice.
        </p>
      </div>

      <AdminNarrationVoicePreview />

      <Link href="/admin" className="ui-text-link text-sm">
        Back to admin
      </Link>
    </section>
  );
}
