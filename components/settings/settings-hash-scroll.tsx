"use client";

import { useEffect } from "react";

export function SettingsHashScroll() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");

    if (!hash) {
      return;
    }

    const target = document.getElementById(hash);

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return null;
}
