"use client";

import { useEffect, useState, useTransition } from "react";

import type { PlanType } from "@/app/generated/prisma/client";
import {
  dayPlanExistsAction,
  monthPlanExistsAction,
  parsePlanTextAction,
  saveParsedPlanAction,
  weekPlanExistsAction,
  yearPlanExistsAction,
} from "@/app/(app)/plans/actions";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { ImageTextImporter } from "@/components/image/image-text-importer";
import type { ImageExtractionResult } from "@/components/image/image-text-importer";
import { ParsedPlanReview } from "@/components/plans/parsed-plan-review";
import { PlanTargetSelector } from "@/components/plans/plan-target-selector";
import type { DateHintConfidence } from "@/lib/ai/date-hints";
import { formatDetectedDateLabel } from "@/lib/ai/date-hints";
import type { ParsedPlan } from "@/lib/ai/plan-parser-schema";
import { formatDateString } from "@/lib/dates";

type Step = "input" | "review";
type InputMode = "text" | "record" | "image";

const IMAGE_EXTRACT_DIVIDER = "--- Extracted from image ---";

type ImageDateSuggestion = {
  dateString: string;
  rawText: string;
  confidence: DateHintConfidence;
  explanation?: string;
};

export function NewPlanFlow() {
  const defaultTodayDate = formatDateString(new Date());

  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [rawInput, setRawInput] = useState("");
  const [draft, setDraft] = useState<ParsedPlan | null>(null);
  const [targetPlanType, setTargetPlanType] = useState<PlanType>("DAY");
  const [selectedDate, setSelectedDate] = useState(defaultTodayDate);
  const [existingDayPlan, setExistingDayPlan] = useState(false);
  const [existingWeekPlan, setExistingWeekPlan] = useState(false);
  const [existingMonthPlan, setExistingMonthPlan] = useState(false);
  const [existingYearPlan, setExistingYearPlan] = useState(false);
  const [imageDateSuggestion, setImageDateSuggestion] =
    useState<ImageDateSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, startParse] = useTransition();
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (step !== "review" || !selectedDate || !draft) {
      setExistingDayPlan(false);
      setExistingWeekPlan(false);
      setExistingMonthPlan(false);
      setExistingYearPlan(false);
      return;
    }

    let cancelled = false;
    const reviewDraft = draft;

    async function checkExistingPlan() {
      if (reviewDraft.planType === "DAY") {
        const exists = await dayPlanExistsAction(selectedDate);
        if (!cancelled) {
          setExistingDayPlan(exists);
          setExistingWeekPlan(false);
          setExistingMonthPlan(false);
          setExistingYearPlan(false);
        }
        return;
      }

      if (reviewDraft.planType === "WEEK") {
        const exists = await weekPlanExistsAction(selectedDate);
        if (!cancelled) {
          setExistingWeekPlan(exists);
          setExistingDayPlan(false);
          setExistingMonthPlan(false);
          setExistingYearPlan(false);
        }
        return;
      }

      if (reviewDraft.planType === "MONTH") {
        const exists = await monthPlanExistsAction(selectedDate);
        if (!cancelled) {
          setExistingMonthPlan(exists);
          setExistingDayPlan(false);
          setExistingWeekPlan(false);
          setExistingYearPlan(false);
        }
        return;
      }

      if (reviewDraft.planType === "YEAR") {
        const exists = await yearPlanExistsAction(selectedDate);
        if (!cancelled) {
          setExistingYearPlan(exists);
          setExistingDayPlan(false);
          setExistingWeekPlan(false);
          setExistingMonthPlan(false);
        }
      }
    }

    void checkExistingPlan();

    return () => {
      cancelled = true;
    };
  }, [step, draft, selectedDate]);

  function handleStructure() {
    setError(null);

    startParse(async () => {
      const result = await parsePlanTextAction(rawInput);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setDraft({
        ...result.draft,
        planType: targetPlanType,
      });
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
          planDate: selectedDate,
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

  function handleImageExtracted(result: ImageExtractionResult) {
    setRawInput((current) => {
      const trimmed = current.trim();
      if (!trimmed) {
        return result.text;
      }

      return `${trimmed}\n\n${IMAGE_EXTRACT_DIVIDER}\n\n${result.text}`;
    });

    if (result.dateHint.detected && result.dateHint.dateString) {
      const suggestion: ImageDateSuggestion = {
        dateString: result.dateHint.dateString,
        rawText: result.dateHint.rawText ?? result.dateHint.dateString,
        confidence: result.dateHint.confidence,
        explanation: result.dateHint.explanation,
      };
      setImageDateSuggestion(suggestion);

      if (
        result.dateHint.confidence === "HIGH" &&
        selectedDate === defaultTodayDate
      ) {
        setSelectedDate(result.dateHint.dateString);
      }
    } else {
      setImageDateSuggestion(null);
    }

    setInputMode("text");
    setError(null);
  }

  if (step === "review" && draft) {
    return (
      <div className="space-y-6">
        <p className="ui-label">Step 2 — Review</p>
        <p className="text-sm text-muted">Edit before saving.</p>

        <ParsedPlanReview
          draft={draft}
          onChange={setDraft}
          planDate={selectedDate}
          onPlanDateChange={setSelectedDate}
          existingDayPlan={existingDayPlan}
          existingWeekPlan={existingWeekPlan}
          existingMonthPlan={existingMonthPlan}
          existingYearPlan={existingYearPlan}
          imageDateHint={
            imageDateSuggestion
              ? {
                  rawText: imageDateSuggestion.rawText,
                  confidence: imageDateSuggestion.confidence,
                  explanation: imageDateSuggestion.explanation,
                }
              : null
          }
          showPlanForSummary
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

      <PlanTargetSelector
        planType={targetPlanType}
        selectedDate={selectedDate}
        onPlanTypeChange={setTargetPlanType}
        onSelectedDateChange={setSelectedDate}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Input mode</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode("text")}
            className={
              inputMode === "text" ? "ui-segment-active" : "ui-segment"
            }
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setInputMode("record")}
            className={
              inputMode === "record" ? "ui-segment-active" : "ui-segment"
            }
          >
            Record
          </button>
          <button
            type="button"
            onClick={() => setInputMode("image")}
            className={
              inputMode === "image" ? "ui-segment-active" : "ui-segment"
            }
          >
            Image
          </button>
        </div>
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
        <ImageTextImporter onExtracted={handleImageExtracted} />
      ) : null}

      {inputMode === "text" ? (
        <>
          {imageDateSuggestion ? (
            <div className="space-y-2 rounded-2xl border border-border-soft bg-accent-cream/35 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {imageDateSuggestion.confidence === "LOW"
                  ? "Possible date detected"
                  : `Detected date: ${formatDetectedDateLabel(imageDateSuggestion.dateString)}`}
              </p>
              {imageDateSuggestion.dateString !== selectedDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate(imageDateSuggestion.dateString)}
                  className="ui-btn-secondary text-sm"
                >
                  Use this date
                </button>
              ) : (
                <p className="text-xs text-muted">Using detected date.</p>
              )}
              <p className="text-xs text-muted">
                From image: {imageDateSuggestion.rawText}
              </p>
              {imageDateSuggestion.explanation ? (
                <p className="text-xs text-muted-light">
                  {imageDateSuggestion.explanation}
                </p>
              ) : null}
              {imageDateSuggestion.confidence === "LOW" ? (
                <p className="text-xs text-muted">
                  Please confirm or change the plan date above before structuring.
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
