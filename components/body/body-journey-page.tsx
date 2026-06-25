"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BodyEntryList } from "@/components/body/body-entry-list";
import { BodyEntrySheet } from "@/components/body/body-entry-sheet";
import { BodyMap } from "@/components/body/body-map";
import { BodyPatterns } from "@/components/body/body-patterns";
import type {
  BodyJourneyPageData,
  SerializedBodyEntry,
} from "@/lib/body-journey/constants";
import {
  BODY_JOURNEY_PERIOD_LABELS,
  BODY_JOURNEY_PERIODS,
  type BodyJourneyPeriodValue,
} from "@/lib/body-journey-period";
import {
  BODY_SIDES,
  BODY_SIDE_LABELS,
  type BodySideValue,
} from "@/lib/body-journey-types";

type BodyJourneyPageProps = {
  data: BodyJourneyPageData;
};

const PERIOD_OPTIONS = BODY_JOURNEY_PERIODS.map((value) => ({
  value,
  label: BODY_JOURNEY_PERIOD_LABELS[value],
}));

const SIDE_OPTIONS = BODY_SIDES.map((value) => ({
  value,
  label: BODY_SIDE_LABELS[value],
}));

function buildBodyHref(period: BodyJourneyPeriodValue, side: BodySideValue): string {
  const params = new URLSearchParams();
  if (period !== "TODAY") {
    params.set("period", period);
  }
  if (side !== "FRONT") {
    params.set("side", side);
  }

  const query = params.toString();
  return query ? `/body?${query}` : "/body";
}

function segmentClass(active: boolean): string {
  return active ? "ui-segment-active" : "ui-segment";
}

export function BodyJourneyPage({ data }: BodyJourneyPageProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [editingEntry, setEditingEntry] = useState<SerializedBodyEntry | null>(null);

  const hasAnyEntries = data.recentEntries.length > 0;

  function openCreateSheet(point: { x: number; y: number }) {
    setEditingEntry(null);
    setSelectedPoint(point);
    setSheetOpen(true);
  }

  function openEditSheet(entry: SerializedBodyEntry) {
    setEditingEntry(entry);
    setSelectedPoint(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSelectedPoint(null);
    setEditingEntry(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildBodyHref(option.value, data.side)}
              className={`min-h-10 rounded-xl px-4 text-sm transition-colors ${segmentClass(
                data.period === option.value,
              )}`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {SIDE_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={buildBodyHref(data.period, option.value)}
              className={`min-h-10 rounded-xl px-4 text-sm transition-colors ${segmentClass(
                data.side === option.value,
              )}`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="ui-card-padded space-y-4">
        {!hasAnyEntries ? (
          <div className="space-y-3 text-center">
            <h2 className="text-base font-medium text-foreground">
              No body observations yet
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              Tap on the body diagram to record a sensation, symptom, or area of
              discomfort.
            </p>
            <button
              type="button"
              onClick={() => openCreateSheet({ x: 0.5, y: 0.45 })}
              className="ui-btn-secondary ui-btn-compact min-h-10 px-4 text-sm"
            >
              Add first observation
            </button>
          </div>
        ) : null}

        <BodyMap
          side={data.side}
          entries={data.mapEntries}
          onSelectPoint={openCreateSheet}
        />
      </section>

      <BodyEntryList entries={data.recentEntries} onEdit={openEditSheet} />
      <BodyPatterns patterns={data.patterns} />

      <BodyEntrySheet
        open={sheetOpen}
        onClose={closeSheet}
        side={editingEntry?.bodySide ?? data.side}
        point={selectedPoint}
        entry={editingEntry}
      />
    </div>
  );
}
