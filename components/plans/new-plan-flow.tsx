"use client";

import { useState, useTransition } from "react";

import {
  parsePlanTextAction,
  saveParsedPlanAction,
} from "@/app/(app)/plans/actions";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { ParsedPlanReview } from "@/components/plans/parsed-plan-review";
import type { ParsedPlan } from "@/lib/ai/plan-parser-schema";

type Step = "input" | "review";
type InputMode = "text" | "record";

export function NewPlanFlow() {
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [rawInput, setRawInput] = useState("");
  const [draft, setDraft] = useState<ParsedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParse] = useTransition();
  const [isSaving, startSave] = useTransition();

  function handleStructure() {
    setError(null);

    startParse(async () => {
      const result = await parsePlanTextAction(rawInput);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setDraft(result.draft);
      setStep("review");
    });
  }

  function handleSave() {
    if (!draft) return;

    setError(null);

    const cleanedItems = draft.items
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        subtasks: (item.subtasks ?? [])
          .map((subtask) => ({
            ...subtask,
            title: subtask.title.trim(),
          }))
          .filter((subtask) => subtask.title.length > 0),
      }))
      .filter((item) => item.title.length > 0);

    if (cleanedItems.length === 0) {
      setError("Add at least one item before saving.");
      return;
    }

    startSave(async () => {
      try {
        await saveParsedPlanAction({
          rawInput,
          title: draft.title.trim(),
          planType: draft.planType,
          language: draft.language,
          summary: draft.summary?.trim() || undefined,
          items: cleanedItems,
        });
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save plan.",
        );
      }
    });
  }

  if (step === "review" && draft) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted">
          Review the structured plan. Edit anything before saving — your changes
          override the suggestion.
        </p>

        <ParsedPlanReview draft={draft} onChange={setDraft} />

        {draft.planType === "DAY" ? (
          <p className="text-sm text-muted">
            If today already has a plan, these items will be added to it.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-accent-red/20 bg-accent-cream px-4 py-3 text-sm text-accent-red">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setStep("input");
              setError(null);
            }}
            className="ui-btn-secondary"
          >
            Back to text
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="ui-btn-primary flex-1"
          >
            {isSaving ? "Saving…" : "Save plan"}
          </button>
        </div>

        <p className="text-xs text-muted-light">Good enough counts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode("text")}
          className={inputMode === "text" ? "ui-segment-active" : "ui-segment"}
        >
          Type
        </button>
        <button
          type="button"
          onClick={() => setInputMode("record")}
          className={inputMode === "record" ? "ui-segment-active" : "ui-segment"}
        >
          Record instead
        </button>
      </div>

      {inputMode === "record" ? (
        <AudioRecorder
          onTranscript={(transcript) => {
            setRawInput((current) =>
              current.trim() ? `${current.trim()}\n\n${transcript}` : transcript,
            );
            setInputMode("text");
            setError(null);
          }}
        />
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Write or paste a messy plan
        </span>
        <textarea
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          dir="auto"
          rows={12}
          placeholder="Tasks, intentions, times, names — in any order."
          className="ui-textarea rounded-2xl"
        />
      </label>

      <p className="text-sm text-muted">
        Farsi, English, or mixed text is okay.
      </p>

      {error ? (
        <p className="rounded-xl border border-accent-red/20 bg-accent-cream px-4 py-3 text-sm text-accent-red">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isParsing || !rawInput.trim()}
        onClick={handleStructure}
        className="ui-btn-primary w-full"
      >
        {isParsing ? "Structuring…" : "Structure plan"}
      </button>
    </div>
  );
}
