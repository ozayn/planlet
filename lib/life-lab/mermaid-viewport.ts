export type MermaidSizeProfile = "compact" | "comfortable" | "landscape" | "dialog";

export function resolveMermaidSizeProfile(input: {
  containerWidth: number;
  variant?: "inline" | "dialog";
  isLandscape?: boolean;
}): MermaidSizeProfile {
  if (input.variant === "dialog") {
    return input.isLandscape && input.containerWidth <= 900
      ? "landscape"
      : "dialog";
  }

  if (input.isLandscape && input.containerWidth <= 900) {
    return "landscape";
  }

  if (input.containerWidth < 520) {
    return "compact";
  }

  return "comfortable";
}

export function isMermaidScrollHintVisible(input: {
  containerWidth: number;
  contentWidth: number;
}): boolean {
  return input.contentWidth > input.containerWidth + 2;
}
