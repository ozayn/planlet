"use client";

import { useEffect, useId, useState } from "react";

import {
  BODY_SYMPTOM_META,
  type BodySideValue,
} from "@/lib/body-journey-types";
import type { SerializedBodyEntry } from "@/lib/body-journey/constants";

type BodyMapProps = {
  side: BodySideValue;
  entries: SerializedBodyEntry[];
  onSelectPoint: (point: { x: number; y: number }) => void;
};

const VIEWBOX = { width: 200, height: 360 };

const SHOW_BODY_GUIDES = process.env.NEXT_PUBLIC_SHOW_BODY_GUIDES === "true";

type BodyRegion = {
  id: string;
  label: string;
  x: number;
  y: number;
  sides: BodySideValue[];
};

const BODY_REGIONS: BodyRegion[] = [
  { id: "head", label: "Head", x: 100, y: 48, sides: ["FRONT", "BACK"] },
  { id: "chest", label: "Chest", x: 100, y: 114, sides: ["FRONT"] },
  { id: "upper-back", label: "Upper back", x: 100, y: 118, sides: ["BACK"] },
  { id: "abdomen", label: "Abdomen", x: 100, y: 152, sides: ["FRONT", "BACK"] },
  { id: "pelvis", label: "Pelvis", x: 100, y: 178, sides: ["FRONT", "BACK"] },
  { id: "left-hand", label: "Left hand", x: 148, y: 186, sides: ["FRONT"] },
  { id: "right-hand", label: "Right hand", x: 52, y: 186, sides: ["FRONT"] },
  { id: "left-hand-back", label: "Left hand", x: 52, y: 186, sides: ["BACK"] },
  { id: "right-hand-back", label: "Right hand", x: 148, y: 186, sides: ["BACK"] },
  { id: "left-foot", label: "Left foot", x: 136, y: 334, sides: ["FRONT"] },
  { id: "right-foot", label: "Right foot", x: 64, y: 334, sides: ["FRONT"] },
  { id: "left-foot-back", label: "Left foot", x: 64, y: 334, sides: ["BACK"] },
  { id: "right-foot-back", label: "Right foot", x: 136, y: 334, sides: ["BACK"] },
];

type HitArea = {
  id: string;
  regionId: string;
  label: string;
  sides: BodySideValue[];
  d: string;
};

const HIT_AREAS: HitArea[] = [
  {
    id: "chest-hit",
    regionId: "chest",
    label: "Chest",
    sides: ["FRONT"],
    d: "M62 92 Q100 82 138 92 L132 138 Q100 146 68 138 Z",
  },
  {
    id: "right-hand-hit-front",
    regionId: "right-hand",
    label: "Right hand",
    sides: ["FRONT"],
    d: "M34 118 Q24 150 30 188 Q38 206 58 198 Q66 182 64 148 Q62 124 72 100 Z",
  },
  {
    id: "left-hand-hit-front",
    regionId: "left-hand",
    label: "Left hand",
    sides: ["FRONT"],
    d: "M166 118 Q176 150 170 188 Q162 206 142 198 Q134 182 136 148 Q138 124 128 100 Z",
  },
  {
    id: "right-foot-hit-front",
    regionId: "right-foot",
    label: "Right foot",
    sides: ["FRONT"],
    d: "M48 300 Q38 330 52 348 Q72 354 84 336 Q88 318 82 296 Z",
  },
  {
    id: "left-foot-hit-front",
    regionId: "left-foot",
    label: "Left foot",
    sides: ["FRONT"],
    d: "M152 300 Q162 330 148 348 Q128 354 116 336 Q112 318 118 296 Z",
  },
  {
    id: "left-hand-hit-back",
    regionId: "left-hand-back",
    label: "Left hand",
    sides: ["BACK"],
    d: "M34 118 Q24 150 30 188 Q38 206 58 198 Q66 182 64 148 Q62 124 72 100 Z",
  },
  {
    id: "right-hand-hit-back",
    regionId: "right-hand-back",
    label: "Right hand",
    sides: ["BACK"],
    d: "M166 118 Q176 150 170 188 Q162 206 142 198 Q134 182 136 148 Q138 124 128 100 Z",
  },
  {
    id: "left-foot-hit-back",
    regionId: "left-foot-back",
    label: "Left foot",
    sides: ["BACK"],
    d: "M48 300 Q38 330 52 348 Q72 354 84 336 Q88 318 82 296 Z",
  },
  {
    id: "right-foot-hit-back",
    regionId: "right-foot-back",
    label: "Right foot",
    sides: ["BACK"],
    d: "M152 300 Q162 330 148 348 Q128 354 116 336 Q112 318 118 296 Z",
  },
];

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

function usePrefersCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return coarse;
}

function OrientationLabels({ side }: { side: BodySideValue }) {
  const isFront = side === "FRONT";

  return (
    <g aria-hidden="true" className="body-map-orientation-label">
      <text x={isFront ? 32 : 32} y={92} textAnchor="middle" fontSize="9" fontWeight="500">
        {isFront ? "R" : "L"}
      </text>
      <text x={isFront ? 168 : 168} y={92} textAnchor="middle" fontSize="9" fontWeight="500">
        {isFront ? "L" : "R"}
      </text>
    </g>
  );
}

function FrontSilhouette() {
  return (
    <g aria-hidden="true">
      <g className="body-map-silhouette">
        <ellipse cx="100" cy="50" rx="24" ry="28" />
        <path d="M88 78 Q100 74 112 78 L110 94 Q100 96 90 94 Z" />
        <path d="M72 94 Q100 88 128 94 L124 188 Q100 194 76 188 Z" />
        <path d="M72 94 Q54 100 48 126 L44 154 L42 172 Q40 184 48 192 Q58 198 66 188 L70 158 L74 132 Q76 112 72 94 Z" />
        <path d="M128 94 Q146 100 152 126 L156 154 L158 172 Q160 184 152 192 Q142 198 134 188 L130 158 L126 132 Q124 112 128 94 Z" />
        <ellipse cx="52" cy="188" rx="13" ry="10" />
        <ellipse cx="148" cy="188" rx="13" ry="10" />
        <path d="M84 188 L78 302 L74 318 Q70 336 82 346 Q94 352 104 340 L106 328 L100 188 Z" />
        <path d="M116 188 L122 302 L126 318 Q130 336 118 346 Q106 352 96 340 L94 328 L100 188 Z" />
        <path d="M74 318 Q82 350 104 344 Q110 334 106 318" />
        <path d="M126 318 Q118 350 96 344 Q90 334 94 318" />
      </g>
      <circle cx="92" cy="47" r="1.5" className="body-map-silhouette-feature" />
      <circle cx="108" cy="47" r="1.5" className="body-map-silhouette-feature" />
      <path d="M94 58 Q100 62 106 58" className="body-map-silhouette-detail" />
      <path d="M78 98 Q88 124 98 116" className="body-map-silhouette-detail" />
      <path d="M122 98 Q112 124 102 116" className="body-map-silhouette-detail" />
    </g>
  );
}

function BackSilhouette() {
  return (
    <g aria-hidden="true">
      <g className="body-map-silhouette">
        <path d="M76 64 Q76 26 100 22 Q124 26 124 64 Q118 74 100 76 Q82 74 76 64 Z" />
        <path d="M90 74 L110 74 L108 92 L92 92 Z" />
        <path d="M70 92 L130 92 L126 188 Q100 196 74 188 Z" />
        <path d="M70 94 Q50 100 44 132 L40 160 L38 172 Q36 184 44 192 Q54 198 62 188 L66 158 L70 132 Z" />
        <path d="M130 94 Q150 100 156 132 L160 160 L162 172 Q164 184 156 192 Q146 198 138 188 L134 158 L130 132 Z" />
        <ellipse cx="52" cy="188" rx="13" ry="10" />
        <ellipse cx="148" cy="188" rx="13" ry="10" />
        <path d="M82 188 L76 302 L72 318 Q68 336 80 346 Q92 352 102 340 L104 328 L98 188 Z" />
        <path d="M118 188 L124 302 L128 318 Q132 336 120 346 Q108 352 98 340 L96 328 L102 188 Z" />
        <path d="M72 318 Q80 350 102 344 Q108 334 104 318" />
        <path d="M128 318 Q120 350 98 344 Q92 334 96 318" />
      </g>
      <path d="M64 92 Q100 86 136 92" className="body-map-silhouette-detail" />
      <ellipse cx="84" cy="118" rx="10" ry="14" className="body-map-silhouette-soft" />
      <ellipse cx="116" cy="118" rx="10" ry="14" className="body-map-silhouette-soft" />
      <path d="M100 94 L100 182" className="body-map-silhouette-detail" />
    </g>
  );
}

function BodyRegionLabels({
  side,
  activeRegion,
  showFaintLabels,
}: {
  side: BodySideValue;
  activeRegion: string | null;
  showFaintLabels: boolean;
}) {
  const labelClass = "body-map-region-label pointer-events-none select-none";

  return (
    <g aria-hidden="true">
      {BODY_REGIONS.filter((region) => region.sides.includes(side)).map((region) => {
        const isActive = activeRegion === region.id;
        const opacity = isActive ? 0.85 : showFaintLabels ? 0.38 : 0;

        if (opacity === 0) {
          return null;
        }

        return (
          <text
            key={region.id}
            x={region.x}
            y={region.y}
            textAnchor="middle"
            fontSize="8"
            fontWeight="500"
            className={labelClass}
            fillOpacity={opacity}
          >
            {region.label}
          </text>
        );
      })}
    </g>
  );
}

function BodyHitAreas({
  side,
  onRegionHover,
}: {
  side: BodySideValue;
  onRegionHover: (regionId: string | null) => void;
}) {
  return (
    <g aria-hidden="true">
      {HIT_AREAS.filter((area) => area.sides.includes(side)).map((area) => (
        <path
          key={area.id}
          d={area.d}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
          onMouseEnter={() => onRegionHover(area.regionId)}
          onMouseLeave={() => onRegionHover(null)}
          onFocus={() => onRegionHover(area.regionId)}
          onBlur={() => onRegionHover(null)}
        >
          <title>{area.label}</title>
        </path>
      ))}
    </g>
  );
}

function BodyGuides({ side }: { side: BodySideValue }) {
  const gridLines = [];

  for (let x = 0; x <= VIEWBOX.width; x += 20) {
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={VIEWBOX.height}
        className="body-map-guide"
        strokeWidth="0.5"
        strokeOpacity={0.12}
      />,
    );
  }

  for (let y = 0; y <= VIEWBOX.height; y += 20) {
    gridLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={VIEWBOX.width}
        y2={y}
        className="body-map-guide"
        strokeWidth="0.5"
        strokeOpacity={0.12}
      />,
    );
  }

  return (
    <g className="pointer-events-none" aria-hidden="true">
      {gridLines}
      {HIT_AREAS.filter((area) => area.sides.includes(side)).map((area) => (
        <path
          key={`guide-${area.id}`}
          d={area.d}
          className="body-map-guide"
          fillOpacity={0.04}
          strokeWidth="0.75"
          strokeOpacity={0.2}
          strokeDasharray="3 3"
        />
      ))}
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
        fillOpacity={0.9}
        stroke="var(--surface)"
        strokeWidth="2"
      />
      <title>{`${meta.label} · ${entry.intensity}/10`}</title>
    </g>
  );
}

export function BodyMap({ side, entries, onSelectPoint }: BodyMapProps) {
  const visibleEntries = entries.filter((entry) => entry.bodySide === side);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const prefersCoarsePointer = usePrefersCoarsePointer();
  const mapDescriptionId = useId();

  return (
    <div className="mx-auto w-full max-w-xs">
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        role="img"
        aria-describedby={mapDescriptionId}
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
        {SHOW_BODY_GUIDES ? <BodyGuides side={side} /> : null}
        {side === "FRONT" ? <FrontSilhouette /> : <BackSilhouette />}
        <OrientationLabels side={side} />
        <BodyRegionLabels
          side={side}
          activeRegion={activeRegion}
          showFaintLabels={prefersCoarsePointer}
        />
        <BodyHitAreas side={side} onRegionHover={setActiveRegion} />
        {visibleEntries.map((entry) => (
          <EntryMarker key={entry.id} entry={entry} />
        ))}
      </svg>
      <p id={mapDescriptionId} className="sr-only">
        {side === "FRONT"
          ? "Facing you. R marks the figure's right side on your left; L marks the figure's left side on your right."
          : "Back view. L marks the figure's left side on your left; R marks the figure's right side on your right."}
      </p>
    </div>
  );
}
