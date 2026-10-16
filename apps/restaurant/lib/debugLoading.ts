/** Optional development-only loading visibility check, enabled by ?debugLoading=true|500|1000|2000. */
export function debugLoadingDuration(): number {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return 0;
  const value = new URLSearchParams(window.location.search).get("debugLoading");
  if (value === "true") return 1000;
  return [500, 1000, 2000].includes(Number(value)) ? Number(value) : 0;
}

/** Keep debug loading visible for a minimum duration after a real request settles. */
export function waitForDebugLoading(startedAt: number, duration: number, signal: AbortSignal): Promise<void> {
  const remaining = startedAt + duration - Date.now();
  if (remaining <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", abort);
    const timer = window.setTimeout(() => { cleanup(); resolve(); }, remaining);
    const abort = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
