import { resolveLifeAreaColor } from "@/lib/life-areas/colors";

type LifeAreaColorDotProps = {
  name?: string | null;
  uncategorized?: boolean;
  className?: string;
  /** Slightly larger marker for section headings. */
  size?: "sm" | "md";
};

/**
 * Subtle Life Area accent marker. Color is supplementary — the area name
 * remains the primary identifier. Navigation/action icons stay monochrome.
 */
export function LifeAreaColorDot({
  name,
  uncategorized = false,
  className = "",
  size = "md",
}: LifeAreaColorDotProps) {
  const color = resolveLifeAreaColor(name, { uncategorized });
  const dimension = size === "sm" ? "size-1.5" : "size-2";

  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full opacity-90 ${dimension} ${className}`.trim()}
      style={{ backgroundColor: color }}
    />
  );
}
