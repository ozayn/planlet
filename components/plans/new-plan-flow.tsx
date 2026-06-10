"use client";

import { useEffect, useState, useTransition } from "react";

import {
  dayPlanExistsAction,
  parsePlanTextAction,
  saveParsedPlanAction,
  weekPlanExistsAction,
} from "@/app/(app)/plans/actions";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { ImageTextImporter } from "@/components/image/image-text-importer";
import type { ImageExtractionResult } from "@/components/image/image-text-importer";
import { ParsedPlanReview } from "@/components/plans/parsed-plan-review";
import type { DateHintConfidence } from "@/lib/ai/date-hints";
import { formatDetectedDateLabel } from "@/lib/ai/date-hints";
import type { ParsedPlan } from "@/lib/ai/plan-parser-schema";
import { formatDateString } from "@/lib/dates";

type Step = "input" | "review";
type InputMode = "text" | "record" | "image";

const IMAGE_EXTRACT_DIVIDER = "--- Extracted from image ---";

type ImageDateHintContext = {
  rawText: string;
  confidence: DateHintConfidence;
  explanation?: string;
};

export function NewPlanFlow() {
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [rawInput, setRawInput] = useState("");
  const [draft, setDraft] = useState<ParsedPlan | null>(null);
  const [planDate, setPlanDate] = useState(formatDateString(new Date()));
  const [existingDayPlan, setExistingDayPlan] = useState(false);
  const [existingWeekPlan, setExistingWeekPlan] = useState(false);
  const [imageDateHint, setImageDateHint] = useState<ImageDateHintContext | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParse] = useTransition();
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (step !== "review" || !planDate) {
      setExistingDayPlan(false);
      setExistingWeekPlan(false);
      return;
    }

    let cancelled = false;

    if (draft?.planType === "DAY") {
      dayPlanExistsAction(planDate).then((exists) => {
        if (!cancelled) {
          setExistingDayPlan(exists);
          setExistingWeekPlan(false);
        }
      });
    } else if (draft?.planType === "WEEK") {
      weekPlanExistsAction(planDate).then((exists) => {
        if (!cancelled) {
          setExistingWeekPlan(exists);
          setExistingDayPlan(false);
        }
      });
    } else {
      setExistingDayPlan(false);
      setExistingWeekPlan(false);
    }

    return () => {
      cancelled = true;
    };
  }, [step, draft?.planType, planDate]);

  function handleStructure() {
    setError(null);

    startParse(async () => {
      const result = await parsePlanTextAction(rawInput);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const nextDraft =
        imageDateHint && planDate
          ? { ...result.draft, planType: "DAY" as const }
          : result.draft;

      setDraft(nextDraft);
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
          planDate:
            draft.planType === "DAY" || draft.planType === "WEEK"
              ? planDate
              : undefined,
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
        <p className="ui-label">Step 2 — Review</p>
        <p className="text-sm text-muted">Edit before saving.</p>

        <ParsedPlanReview
          draft={draft}
          onChange={setDraft}
          planDate={
            draft.planType === "DAY" || draft.planType === "WEEK"
              ? planDate
              : undefined
          }
          onPlanDateChange={
            draft.planType === "DAY" || draft.planType === "WEEK"
              ? setPlanDate
              : undefined
          }
          existingDayPlan={existingDayPlan}
          existingWeekPlan={existingWeekPlan}
          imageDateHint={imageDateHint}
        />

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
            Back to input
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
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="ui-label">Step 1 — Input</p>

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
          Record
        </button>
        <button
          type="button"
          onClick={() => setInputMode("image")}
          className={inputMode === "image" ? "ui-segment-active" : "ui-segment"}
        >
          Image
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

      {inputMode === "image" ? (
        <ImageTextImporter
          onExtracted={(result: ImageExtractionResult) => {
            setRawInput((current) => {
              const trimmed = current.trim();
              if (!trimmed) {
                return result.text;
              }

              return `${trimmed}\n\n${IMAGE_EXTRACT_DIVIDER}\n\n${result.text}`;
            });

            if (result.dateHint.detected) {
              if (result.dateHint.dateString) {
                setPlanDate(result.dateHint.dateString);
              }

              if (result.dateHint.rawText) {
                setImageDateHint({
                  rawText: result.dateHint.rawText,
                  confidence: result.dateHint.confidence,
                  explanation: result.dateHint.explanation,
                });
              } else {
                setImageDateHint(null);
              }
            } else {
              setImageDateHint(null);
            }

            setInputMode("text");
            setError(null);
          }}
        />
      ) : null}

      {inputMode === "text" ? (
        <>
          {imageDateHint ? (
            <div className="space-y-2 rounded-2xl border border-border-soft bg-accent-cream/35 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {imageDateHint.confidence === "LOW"
                  ? "Possible date detected"
                  : `Detected date: ${formatDetectedDateLabel(planDate)}`}
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-light">
                  Confirm plan date
                </span>
                <input
                  type="date"
                  value={planDate}
                  onChange={(event) => setPlanDate(event.target.value)}
                  className="ui-input min-h-11 py-2"
                />
              </label>
              <p className="text-xs text-muted">
                From image: {imageDateHint.rawText}
              </p>
              {imageDateHint.explanation ? (
                <p className="text-xs text-muted-light">
                  {imageDateHint.explanation}
                </p>
              ) : null}
              {imageDateHint.confidence === "LOW" ? (
                <p className="text-xs text-muted">
                  Please confirm or change this date before structuring.
                </p>
              ) : null}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Messy notes
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

          <p className="text-xs text-muted-light">
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
        </>
      ) : null}
    </div>
  );
}
