export type MermaidThemeMode = "light" | "dark";

export function getMermaidThemeMode(
  resolvedTheme: string | undefined,
): MermaidThemeMode {
  return resolvedTheme === "dark" ? "dark" : "light";
}

export function getMermaidInitializeOptions(theme: MermaidThemeMode) {
  const isDark = theme === "dark";

  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    theme: isDark ? ("dark" as const) : ("base" as const),
    themeVariables: {
      fontSize: "16px",
      primaryColor: isDark ? "#2a2621" : "#f8f5ef",
      primaryTextColor: isDark ? "#f4efe8" : "#171412",
      primaryBorderColor: isDark ? "#8a8178" : "#b8afa6",
      lineColor: isDark ? "#d8d0c7" : "#3f3a36",
    },
    flowchart: {
      padding: 12,
      nodeSpacing: 50,
      rankSpacing: 60,
      diagramPadding: 12,
    },
  };
}
