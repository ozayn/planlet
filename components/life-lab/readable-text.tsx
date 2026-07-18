"use client";

import { Children, memo, type ReactNode } from "react";

import type { LifeLabReadingMode } from "@/lib/life-lab/reading-preferences";
import {
  segmentBionicText,
  segmentStudyText,
  type StudyTarget,
} from "@/lib/life-lab/reading-text";

function BionicString({ text }: { text: string }) {
  const segments = segmentBionicText(text);

  return segments.map((segment, index) =>
    segment.emphasized ? (
      <strong
        key={`${index}-${segment.text}`}
        className="ui-bionic-prefix"
      >
        {segment.text}
      </strong>
    ) : (
      segment.text
    ),
  );
}

function StudyString({
  text,
  targets,
}: {
  text: string;
  targets: StudyTarget[];
}) {
  return segmentStudyText(text, targets).map((segment, index) =>
    segment.target ? (
      <mark
        key={`${index}-${segment.text}`}
        className="ui-study-emphasis"
        data-study-kind={segment.target.kind}
        title={
          segment.target.kind === "organization"
            ? "Organization"
            : segment.target.kind.charAt(0).toUpperCase() +
              segment.target.kind.slice(1)
        }
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}

export const ReadableText = memo(function ReadableText({
  children,
  mode,
  studyTargets,
}: {
  children: ReactNode;
  mode: LifeLabReadingMode;
  studyTargets: StudyTarget[];
}) {
  if (mode !== "bionic" && mode !== "study") {
    return children;
  }

  return Children.map(children, (child) => {
    if (typeof child !== "string") {
      return child;
    }

    return mode === "bionic" ? (
      <BionicString text={child} />
    ) : (
      <StudyString text={child} targets={studyTargets} />
    );
  });
});
