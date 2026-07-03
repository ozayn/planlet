"use client";

import { useEffect, useId, useState, useTransition } from "react";

import {
  createBodyEntryAction,
  updateBodyEntryAction,
} from "@/app/(app)/body/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import type { SerializedBodyEntry } from "@/lib/body-journey/constants";
import { formatBodyEntryTags } from "@/lib/body-journey/constants";
import {
  BODY_SIDE_LABELS,
  BODY_SKIN_CHANGE_LABELS,
  BODY_SKIN_CHANGE_STATUSES,
  BODY_SYMPTOM_GROUPS,
  BODY_SYMPTOM_META,
  isSkinSymptomType,
  type BodySideValue,
  type BodySkinChangeStatusValue,
  type BodySymptomTypeValue,
} from "@/lib/body-journey-types";
import { formatDateString, shiftDateString } from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type BodyEntrySheetProps = {
  open: boolean;
  onClose: () => void;
  side: BodySideValue;
  point: { x: number; y: number } | null;
  entry: SerializedBodyEntry | null;
  defaultObservedDate: string;
};

function formatMarkerHint(x: number, y: number): string {
  const vertical = y < 0.34 ? "upper" : y > 0.66 ? "lower" : "middle";
  const horizontal = x < 0.34 ? "left" : x > 0.66 ? "right" : "center";
  return `${vertical} ${horizontal}`;
}

function SymptomTypeChip({
  type,
  selected,
  onSelect,
}: {
  type: BodySymptomTypeValue;
  selected: boolean;
  onSelect: (type: BodySymptomTypeValue) => void;
}) {
  const meta = BODY_SYMPTOM_META[type];

  return (
    <label
      className={`flex min-h-10 cursor-pointer items-center rounded-xl px-3 text-sm transition-colors ${
        selected ? "ui-segment-active" : "ui-segment"
      }`}
    >
      <input
        type="radio"
        name="body-symptom-type"
        value={type}
        checked={selected}
        onChange={() => onSelect(type)}
        className="sr-only"
        {...passwordManagerSafeControlProps}
      />
      {meta.label}
    </label>
  );
}

export function BodyEntrySheet({
  open,
  onClose,
  side,
  point,
  entry,
  defaultObservedDate,
}: BodyEntrySheetProps) {
  const [symptomType, setSymptomType] = useState<BodySymptomTypeValue>("PAIN");
  const [intensity, setIntensity] = useState(5);
  const [observedAt, setObservedAt] = useState(defaultObservedDate);
  const [notes, setNotes] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [skinSize, setSkinSize] = useState("");
  const [skinShape, setSkinShape] = useState("");
  const [skinColor, setSkinColor] = useState("");
  const [skinChanged, setSkinChanged] = useState<BodySkinChangeStatusValue | "">(
    "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const notesId = useId();
  const tagsId = useId();
  const intensityId = useId();
  const observedAtId = useId();

  const skinSizeId = useId();
  const skinShapeId = useId();
  const skinColorId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (entry) {
      setSymptomType(entry.symptomType);
      setIntensity(entry.intensity);
      setObservedAt(formatDateString(new Date(entry.observedAt)));
      setNotes(entry.notes ?? "");
      setTagsRaw(formatBodyEntryTags(entry.tags));
      setSkinSize(entry.skinSize ?? "");
      setSkinShape(entry.skinShape ?? "");
      setSkinColor(entry.skinColor ?? "");
      setSkinChanged(entry.skinChanged ?? "");
    } else {
      setSymptomType("PAIN");
      setIntensity(5);
      setObservedAt(defaultObservedDate);
      setNotes("");
      setTagsRaw("");
      setSkinSize("");
      setSkinShape("");
      setSkinColor("");
      setSkinChanged("");
    }

    setError(null);
  }, [open, entry, defaultObservedDate]);

  function handleSave() {
    if (!point && !entry) {
      return;
    }

    if (!observedAt.trim()) {
      setError("Observed date is required.");
      return;
    }

    const marker = entry
      ? { x: entry.markerX, y: entry.markerY }
      : point!;

    startTransition(async () => {
      const payload = {
        observedAt,
        bodySide: side,
        markerX: marker.x,
        markerY: marker.y,
        symptomType,
        intensity,
        notes: notes.trim() || null,
        tagsRaw,
        skinSize: skinSize.trim() || null,
        skinShape: skinShape.trim() || null,
        skinColor: skinColor.trim() || null,
        skinChanged: skinChanged || null,
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

  const marker = entry
    ? { x: entry.markerX, y: entry.markerY }
    : point;
  const title = entry ? "Edit observation" : "Add observation";
  const dateShortcuts = [
    { label: "Today", value: defaultObservedDate },
    { label: "Yesterday", value: shiftDateString(defaultObservedDate, -1) },
    { label: "1 week ago", value: shiftDateString(defaultObservedDate, -7) },
  ];

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
            disabled={isPending || (!entry && !point) || !observedAt.trim()}
            onClick={handleSave}
            className="ui-btn-primary w-full disabled:opacity-50"
          >
            {isPending ? "Saving…" : entry ? "Save changes" : "Save observation"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {marker ? (
          <div className="rounded-xl border border-border-soft bg-surface/50 px-3 py-2.5">
            <p className="text-xs font-medium text-muted">Location</p>
            <p className="mt-0.5 text-sm text-foreground">
              {BODY_SIDE_LABELS[side]} · {formatMarkerHint(marker.x, marker.y)}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor={observedAtId} className="ui-label">
            Observed on
          </label>
          <input
            id={observedAtId}
            name="body-observed-at"
            type="date"
            required
            value={observedAt}
            onChange={(event) => setObservedAt(event.target.value)}
            className="ui-input min-h-11 w-full text-sm"
            {...passwordManagerSafeControlProps}
          />
          <div className="flex flex-wrap gap-1.5">
            {dateShortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => setObservedAt(shortcut.value)}
                {...passwordManagerSafeControlProps}
                className={`min-h-9 rounded-full border px-3 py-1 text-xs transition-colors ${
                  observedAt === shortcut.value
                    ? "border-border bg-accent-cream/60 text-foreground"
                    : "border-border-soft text-muted hover:border-border hover:text-foreground"
                }`}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="space-y-4">
          <legend className="ui-label">Symptom type</legend>
          {BODY_SYMPTOM_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs font-medium text-muted">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.types.map((type) => (
                  <SymptomTypeChip
                    key={type}
                    type={type}
                    selected={symptomType === type}
                    onSelect={setSymptomType}
                  />
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        {isSkinSymptomType(symptomType) ? (
          <details className="rounded-xl border border-border-soft bg-surface/50 px-3 py-2.5">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              More details (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <label htmlFor={skinSizeId} className="block space-y-2">
                <span className="ui-label">Size</span>
                <input
                  id={skinSizeId}
                  name="body-skin-size"
                  type="text"
                  value={skinSize}
                  onChange={(event) => setSkinSize(event.target.value)}
                  className="ui-input min-h-10 text-sm"
                  placeholder="pea-sized, 2 cm"
                  {...passwordManagerSafeControlProps}
                />
              </label>

              <label htmlFor={skinShapeId} className="block space-y-2">
                <span className="ui-label">Shape</span>
                <input
                  id={skinShapeId}
                  name="body-skin-shape"
                  type="text"
                  value={skinShape}
                  onChange={(event) => setSkinShape(event.target.value)}
                  className="ui-input min-h-10 text-sm"
                  placeholder="round, irregular"
                  {...passwordManagerSafeControlProps}
                />
              </label>

              <label htmlFor={skinColorId} className="block space-y-2">
                <span className="ui-label">Color</span>
                <input
                  id={skinColorId}
                  name="body-skin-color"
                  type="text"
                  value={skinColor}
                  onChange={(event) => setSkinColor(event.target.value)}
                  className="ui-input min-h-10 text-sm"
                  placeholder="red, brown, pale"
                  {...passwordManagerSafeControlProps}
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="ui-label">Changed since last time?</legend>
                <div className="flex flex-wrap gap-2">
                  {BODY_SKIN_CHANGE_STATUSES.map((status) => (
                    <label
                      key={status}
                      className={`flex min-h-10 cursor-pointer items-center rounded-xl px-3 text-sm transition-colors ${
                        skinChanged === status
                          ? "ui-segment-active"
                          : "ui-segment"
                      }`}
                    >
                      <input
                        type="radio"
                        name="body-skin-changed"
                        value={status}
                        checked={skinChanged === status}
                        onChange={() => setSkinChanged(status)}
                        className="sr-only"
                        {...passwordManagerSafeControlProps}
                      />
                      {BODY_SKIN_CHANGE_LABELS[status]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </details>
        ) : null}

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
