export type MermaidRenderVariant = "inline" | "dialog";

export type MermaidThemeMode = "light" | "dark";

export type MermaidLabelWrapOptions = {
  maxCharactersPerLine: number;
  maxLines: number;
};

export const MERMAID_INLINE_WRAPPING_WIDTH = 168;
export const MERMAID_DIALOG_WRAPPING_WIDTH = 220;

export function getMermaidThemeMode(
  resolvedTheme: string | undefined,
): MermaidThemeMode {
  return resolvedTheme === "dark" ? "dark" : "light";
}

export function getMermaidLabelWrapOptions(
  variant: MermaidRenderVariant = "inline",
): MermaidLabelWrapOptions {
  if (variant === "dialog") {
    return {
      maxCharactersPerLine: 30,
      maxLines: 4,
    };
  }

  return {
    maxCharactersPerLine: 24,
    maxLines: 3,
  };
}

export function getMermaidWrappingWidth(
  variant: MermaidRenderVariant = "inline",
): number {
  return variant === "dialog"
    ? MERMAID_DIALOG_WRAPPING_WIDTH
    : MERMAID_INLINE_WRAPPING_WIDTH;
}

export function getMermaidInitializeOptions(
  theme: MermaidThemeMode,
  variant: MermaidRenderVariant = "inline",
) {
  const isDark = theme === "dark";

  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    htmlLabels: true,
    theme: isDark ? ("dark" as const) : ("base" as const),
    themeVariables: {
      fontSize: "16px",
      primaryColor: isDark ? "#2a2621" : "#f8f5ef",
      primaryTextColor: isDark ? "#f4efe8" : "#171412",
      primaryBorderColor: isDark ? "#8a8178" : "#b8afa6",
      lineColor: isDark ? "#d8d0c7" : "#3f3a36",
    },
    flowchart: {
      padding: 10,
      nodeSpacing: 32,
      rankSpacing: 44,
      diagramPadding: 12,
      wrappingWidth: getMermaidWrappingWidth(variant),
    },
  };
}
