"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect } from "react";

const DAY_THEME_COLOR = "#faf9f7";
const NIGHT_THEME_COLOR = "#141210";

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color =
      resolvedTheme === "dark" ? NIGHT_THEME_COLOR : DAY_THEME_COLOR;
    const meta = document.querySelector('meta[name="theme-color"]');

    if (meta) {
      meta.setAttribute("content", color);
    }
  }, [resolvedTheme]);

  return null;
}
