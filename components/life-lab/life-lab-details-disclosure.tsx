"use client";

type LifeLabDetailsDisclosureProps = {
  tagCount?: number;
  children: React.ReactNode;
  className?: string;
};

export function LifeLabDetailsDisclosure({
  tagCount = 0,
  children,
  className = "",
}: LifeLabDetailsDisclosureProps) {
  return (
    <details
      data-life-lab-details-disclosure=""
      className={`ui-settings-details group ${className}`.trim()}
    >
      <summary className="ui-settings-details-summary">
        Details
        {tagCount > 0 ? (
          <span className="font-normal text-muted-light">
            {" "}
            · {tagCount} topics
          </span>
        ) : null}
      </summary>
      <div className="ui-settings-details-body space-y-3">{children}</div>
    </details>
  );
}
