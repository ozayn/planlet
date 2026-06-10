import Script from "next/script";

/**
 * Dev-only workaround for React 19 + Turbopack calling performance.measure()
 * with invalid end times when a Server Component render aborts (HMR, fast nav).
 * The "\u200b" prefix in error names is added by React profiling, not app source.
 * @see https://github.com/vercel/next.js/issues/86060
 */
const DEV_PERFORMANCE_PATCH = `
(function () {
  try {
    var perf = window.performance;
    if (!perf || typeof perf.measure !== "function" || perf.__planletPatched) return;
    var original = perf.measure.bind(perf);
    perf.measure = function () {
      try {
        return original.apply(perf, arguments);
      } catch (err) {
        var message = (err && err.message) || "";
        if (message.indexOf("negative time stamp") !== -1) return;
        throw err;
      }
    };
    perf.__planletPatched = true;
  } catch (_err) {}
})();
`.trim();

export function DevPerformancePatch() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Script id="planlet-dev-performance-patch" strategy="beforeInteractive">
      {DEV_PERFORMANCE_PATCH}
    </Script>
  );
}
