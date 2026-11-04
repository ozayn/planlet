"use client";
import { useEffect, useState } from "react";
export function JobTrackerUpdateNotice() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let initial: string | null = null;
    let disposed = false;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/app-version", { cache: "no-store" });
        if (!response.ok) return;
        const { version } = await response.json();
        if (disposed || typeof version !== "string") return;
        if (initial && initial !== version) setAvailable(true);
        initial ??= version;
      } catch { /* Check again when connectivity returns. */ }
    }
    void check();
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, []);
  return available ? <p role="status" className="text-sm">An update is available. <button className="ui-text-link min-h-10" onClick={() => window.location.reload()}>Refresh when ready</button></p> : null;
}
