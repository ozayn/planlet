"use client";

import {
  BODY_SYMPTOM_META,
  type BodySideValue,
  type BodySymptomTypeValue,
} from "@/lib/body-journey-types";
import type { SerializedBodyEntry } from "@/lib/body-journey/constants";

type BodyMapProps = {
  side: BodySideValue;
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
    <g
      className="text-border"
      fill="currentColor"
      fillOpacity={0.12}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <ellipse cx="100" cy="50" rx="24" ry="28" />
      <circle cx="92" cy="47" r="1.5" fill="currentColor" fillOpacity={0.35} stroke="none" />
      <circle cx="108" cy="47" r="1.5" fill="currentColor" fillOpacity={0.35} stroke="none" />
      <path
        d="M94 58 Q100 62 106 58"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth="1"
      />
      <path d="M88 78 Q100 74 112 78 L110 94 Q100 96 90 94 Z" />
      <path d="M72 94 Q100 88 128 94 L124 188 Q100 194 76 188 Z" />
      <path d="M72 96 Q52 104 46 134 L40 172 Q54 168 62 138 Z" />
      <path d="M128 96 Q148 104 154 134 L160 172 Q146 168 138 138 Z" />
      <path d="M84 188 L78 328 Q92 334 98 328 L100 188 Z" />
      <path d="M116 188 L122 328 Q108 334 102 328 L100 188 Z" />
    </g>
  );
}

function BackSilhouette() {
  return (
    <g
      className="text-border"
      fill="currentColor"
      fillOpacity={0.12}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M76 64 Q76 26 100 22 Q124 26 124 64 Q118 74 100 76 Q82 74 76 64 Z" />
      <path d="M90 74 L110 74 L108 92 L92 92 Z" />
      <path
        d="M64 92 Q100 86 136 92"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
      />
      <path d="M70 92 L130 92 L126 188 Q100 196 74 188 Z" />
      <ellipse
        cx="84"
        cy="118"
        rx="10"
        ry="14"
        fill="currentColor"
        fillOpacity={0.06}
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth="1"
      />
      <ellipse
        cx="116"
        cy="118"
        rx="10"
        ry="14"
        fill="currentColor"
        fillOpacity={0.06}
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth="1"
      />
      <path
        d="M100 94 L100 182"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth="1"
      />
      <path d="M70 94 Q50 100 44 132 L38 170 Q52 166 60 136 Z" />
      <path d="M130 94 Q150 100 156 132 L162 170 Q148 166 140 136 Z" />
      <path d="M82 188 L76 328 Q90 334 96 328 L98 188 Z" />
      <path d="M118 188 L124 328 Q110 334 104 328 L102 188 Z" />
    </g>
  );
}

function EntryMarker({ entry }: { entry: SerializedBodyEntry }) {
  const meta = BODY_SYMPTOM_META[entry.symptomType];

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
  const visibleEntries = entries.filter((entry) => entry.bodySide === side);

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
        {visibleEntries.map((entry) => (
          <EntryMarker key={entry.id} entry={entry} />
        ))}
      </svg>
    </div>
  );
}
