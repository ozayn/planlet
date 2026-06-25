"use client";

import type { BodySide, BodySymptomType } from "@/app/generated/prisma/client";

import {
  BODY_SYMPTOM_META,
  type SerializedBodyEntry,
} from "@/lib/body-journey/constants";

type BodyMapProps = {
  side: BodySide;
  entries: SerializedBodyEntry[];
  onSelectPoint: (point: { x: number; y: number }) => void;
};

const VIEWBOX = { width: 200, height: 360 };

function handleMapClick(
  event: React.MouseEvent<SVGSVGElement>,
  onSelectPoint: BodyMapProps["onSelectPoint"],
) {
  const svg = event.currentTarget;
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return;
  }

  onSelectPoint({ x, y });
}

function FrontSilhouette() {
  return (
    <g className="text-border" fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="100" cy="52" rx="26" ry="30" />
      <path d="M78 82 Q100 74 122 82 L128 190 Q100 198 72 190 Z" />
      <path d="M78 84 Q58 92 48 128 L42 168 Q58 162 68 132 Z" />
      <path d="M122 84 Q142 92 152 128 L158 168 Q142 162 132 132 Z" />
      <path d="M82 190 L74 330 Q88 336 96 330 L100 190 Z" />
      <path d="M118 190 L126 330 Q112 336 104 330 L100 190 Z" />
    </g>
  );
}

function BackSilhouette() {
  return (
    <g className="text-border" fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="100" cy="52" rx="26" ry="30" />
      <path d="M78 82 Q100 74 122 82 L128 190 Q100 198 72 190 Z" />
      <path d="M78 84 Q58 92 48 128 L42 168 Q58 162 68 132 Z" />
      <path d="M122 84 Q142 92 152 128 L158 168 Q142 162 132 132 Z" />
      <path d="M82 190 L74 330 Q88 336 96 330 L100 190 Z" />
      <path d="M118 190 L126 330 Q112 336 104 330 L100 190 Z" />
      <line x1="100" y1="96" x2="100" y2="168" strokeOpacity={0.35} />
    </g>
  );
}

function EntryMarker({ entry }: { entry: SerializedBodyEntry }) {
  const meta = BODY_SYMPTOM_META[entry.symptomType as BodySymptomType];

  return (
    <g
      transform={`translate(${entry.markerX * VIEWBOX.width} ${entry.markerY * VIEWBOX.height})`}
      aria-hidden="true"
    >
      <circle
        r="7"
        fill={meta.color}
        fillOpacity={0.85}
        stroke="var(--surface)"
        strokeWidth="1.5"
      />
      <title>
        {meta.label} · {entry.intensity}/10
      </title>
    </g>
  );
}

export function BodyMap({ side, entries, onSelectPoint }: BodyMapProps) {
  return (
    <div className="mx-auto w-full max-w-xs">
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        role="img"
        aria-label={
          side === "FRONT"
            ? "Front body diagram. Tap to record a sensation."
            : "Back body diagram. Tap to record a sensation."
        }
        className="h-auto w-full cursor-pointer touch-manipulation select-none"
        onClick={(event) => handleMapClick(event, onSelectPoint)}
      >
        <rect
          x="0"
          y="0"
          width={VIEWBOX.width}
          height={VIEWBOX.height}
          fill="transparent"
        />
        {side === "FRONT" ? <FrontSilhouette /> : <BackSilhouette />}
        {entries.map((entry) => (
          <EntryMarker key={entry.id} entry={entry} />
        ))}
      </svg>
    </div>
  );
}
