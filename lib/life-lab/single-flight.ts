// Coalesce cache misses only while work is running. Successful data remains in
// Next's tagged cache; failures must be retryable after the Drive cooldown.
const inFlight = new Map<string, Promise<unknown>>();

export function singleFlight<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = Promise.resolve().then(load).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, pending);
  return pending;
}
