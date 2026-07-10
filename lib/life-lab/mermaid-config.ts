import type { MermaidSizeProfile } from "@/lib/life-lab/mermaid-viewport";

export type MermaidRenderVariant = "inline" | "dialog";

export type MermaidThemeMode = "light" | "dark";

export type MermaidLabelWrapOptions = {
  maxCharactersPerLine: number;
  maxLines: number;
};

const PROFILE_LAYOUT: Record<
  MermaidSizeProfile,
  {
    fontSize: string;
    nodeSpacing: number;
    rankSpacing: number;
    diagramPadding: number;
    wrappingWidth: number;
    maxCharactersPerLine: number;
    maxLines: number;
  }
> = {
  compact: {
    fontSize: "13px",
    nodeSpacing: 24,
    rankSpacing: 34,
    diagramPadding: 8,
    wrappingWidth: 132,
    maxCharactersPerLine: 20,
    maxLines: 3,
  },
  comfortable: {
    fontSize: "15px",
    nodeSpacing: 32,
    rankSpacing: 44,
    diagramPadding: 12,
    wrappingWidth: 168,
    maxCharactersPerLine: 24,
    maxLines: 3,
  },
  landscape: {
    fontSize: "15px",
    nodeSpacing: 36,
    rankSpacing: 48,
    diagramPadding: 12,
    wrappingWidth: 208,
    maxCharactersPerLine: 28,
    maxLines: 4,
  },
  dialog: {
    fontSize: "16px",
    nodeSpacing: 40,
    rankSpacing: 52,
    diagramPadding: 14,
    wrappingWidth: 220,
    maxCharactersPerLine: 30,
    maxLines: 4,
  },
};

export function getMermaidThemeMode(
  resolvedTheme: string | undefined,
): MermaidThemeMode {
  return resolvedTheme === "dark" ? "dark" : "light";
}

export function getMermaidLabelWrapOptions(
  profile: MermaidSizeProfile = "comfortable",
): MermaidLabelWrapOptions {
  const layout = PROFILE_LAYOUT[profile];

  return {
    maxCharactersPerLine: layout.maxCharactersPerLine,
    maxLines: layout.maxLines,
  };
}

export function getMermaidWrappingWidth(
  profile: MermaidSizeProfile = "comfortable",
): number {
  return PROFILE_LAYOUT[profile].wrappingWidth;
}

export function getMermaidInitializeOptions(
  theme: MermaidThemeMode,
  profile: MermaidSizeProfile = "comfortable",
) {
  const isDark = theme === "dark";
  const layout = PROFILE_LAYOUT[profile];

  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    htmlLabels: true,
    theme: isDark ? ("dark" as const) : ("base" as const),
    themeVariables: {
      fontSize: layout.fontSize,
      primaryColor: isDark ? "#2a2621" : "#f8f5ef",
      primaryTextColor: isDark ? "#f4efe8" : "#171412",
      primaryBorderColor: isDark ? "#8a8178" : "#b8afa6",
      lineColor: isDark ? "#d8d0c7" : "#3f3a36",
    },
    flowchart: {
      padding: 8,
      nodeSpacing: layout.nodeSpacing,
      rankSpacing: layout.rankSpacing,
      diagramPadding: layout.diagramPadding,
      wrappingWidth: layout.wrappingWidth,
    },
  };
}
