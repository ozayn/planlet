"use client";

import { useEffect, useId, useState, useTransition } from "react";

import {
  createBodyEntryAction,
  updateBodyEntryAction,
} from "@/app/(app)/body/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import type { SerializedBodyEntry } from "@/lib/body-journey/constants";
import {
  formatBodyEntryTags,
} from "@/lib/body-journey/constants";
import {
  BODY_SYMPTOM_META,
  BODY_SYMPTOM_TYPES,
  type BodySideValue,
  type BodySymptomTypeValue,
} from "@/lib/body-journey-types";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type BodyEntrySheetProps = {
  open: boolean;
  onClose: () => void;
  side: BodySideValue;
  point: { x: number; y: number } | null;
  entry: SerializedBodyEntry | null;
};

export function BodyEntrySheet({
  open,
  onClose,
  side,
  point,
  entry,
}: BodyEntrySheetProps) {
  const [symptomType, setSymptomType] = useState<BodySymptomTypeValue>("PAIN");
  const [intensity, setIntensity] = useState(5);
  const [notes, setNotes] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const notesId = useId();
  const tagsId = useId();
  const intensityId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (entry) {
      setSymptomType(entry.symptomType);
      setIntensity(entry.intensity);
      setNotes(entry.notes ?? "");
      setTagsRaw(formatBodyEntryTags(entry.tags));
    } else {
      setSymptomType("PAIN");
      setIntensity(5);
      setNotes("");
      setTagsRaw("");
    }

    setError(null);
  }, [open, entry]);

  function handleSave() {
    if (!point && !entry) {
      return;
    }

    const marker = entry
      ? { x: entry.markerX, y: entry.markerY }
      : point!;

    startTransition(async () => {
      const payload = {
        bodySide: side,
        markerX: marker.x,
        markerY: marker.y,
        symptomType,
        intensity,
        notes: notes.trim() || null,
        tagsRaw,
      };

      const result = entry
        ? await updateBodyEntryAction(entry.id, payload)
        : await createBodyEntryAction(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onClose();
    });
  }

  const title = entry ? "Edit observation" : "Add observation";

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="space-y-2">
          {error ? <p className="text-sm text-accent-red">{error}</p> : null}
          <button
            type="button"
            disabled={isPending || (!entry && !point)}
            onClick={handleSave}
            className="ui-btn-primary w-full disabled:opacity-50"
          >
            {isPending ? "Saving…" : entry ? "Save changes" : "Save observation"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="ui-label">Symptom type</legend>
          <div className="flex flex-wrap gap-2">
            {BODY_SYMPTOM_TYPES.map((type) => {
              const meta = BODY_SYMPTOM_META[type];

              return (
                <label
                  key={type}
                  className={`flex min-h-10 cursor-pointer items-center rounded-xl px-3 text-sm transition-colors ${
                    symptomType === type ? "ui-segment-active" : "ui-segment"
                  }`}
                >
                  <input
                    type="radio"
                    name="body-symptom-type"
                    value={type}
                    checked={symptomType === type}
                    onChange={() => setSymptomType(type)}
                    className="sr-only"
                    {...passwordManagerSafeControlProps}
                  />
                  {meta.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor={intensityId} className="ui-label">
            Intensity · {intensity}/10
          </label>
          <input
            id={intensityId}
            name="body-intensity"
            type="range"
            min={0}
            max={10}
            step={1}
            value={intensity}
            onChange={(event) => setIntensity(Number(event.target.value))}
            className="w-full accent-foreground"
            {...passwordManagerSafeControlProps}
          />
        </div>

        <label htmlFor={notesId} className="block space-y-2">
          <span className="ui-label">Notes (optional)</span>
          <textarea
            id={notesId}
            name="body-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="ui-textarea text-sm"
            placeholder="What did you notice?"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <label htmlFor={tagsId} className="block space-y-2">
          <span className="ui-label">Tags (optional)</span>
          <input
            id={tagsId}
            name="body-tags"
            type="text"
            value={tagsRaw}
            onChange={(event) => setTagsRaw(event.target.value)}
            className="ui-input min-h-10 text-sm"
            placeholder="morning, left side"
            {...passwordManagerSafeControlProps}
          />
        </label>
      </div>
    </SimpleSheet>
  );
}
