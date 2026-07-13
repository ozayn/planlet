import Link from "next/link";

import { AdminNarrationVoicePreview } from "@/components/admin/admin-narration-voice-preview";
import { PageHeader } from "@/components/page-header";
import { requireAdminUser } from "@/lib/admin-stats";
import {
  getOpenAiTtsConfigurationStatus,
  isLifeLabOpenAiTtsEnabled,
} from "@/lib/env";
import { NARRATION_INSTRUCTION_VERSION } from "@/lib/life-lab/narration-config";
import { resolveOpenAiNarrationSettings } from "@/lib/life-lab/openai-narration-preferences";

export default async function AdminNarrationVoicePreviewPage() {
  await requireAdminUser();

  const ttsStatus = getOpenAiTtsConfigurationStatus();
  const britishSettings = resolveOpenAiNarrationSettings({
    voice: ttsStatus.voice,
    narrationStyle: "BRITISH_FEMALE_CALM",
    customNarrationInstructions: null,
  });

  return (
    <section className="space-y-5">
      <PageHeader
        title="Voice preview"
        subtitle="Compare OpenAI narration voices and styles without cache."
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
          <span className="font-medium text-foreground">British sample instructions:</span>{" "}
          {britishSettings.instructions}
        </p>
      </div>

      <AdminNarrationVoicePreview />

      <Link href="/admin" className="ui-text-link text-sm">
        Back to admin
      </Link>
    </section>
  );
}
