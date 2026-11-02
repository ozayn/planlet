/** Process-wide backpressure for Drive, shared by listings and downloads. */
export class DriveRequestGate {
  private active = 0;
  private waiters: Array<() => void> = [];
  private blockedUntil = 0;
  private nextStart = 0;
  private failure: Error | null = null;

  constructor(
    private readonly concurrency = 4,
    private readonly intervalMs = 0,
  ) {}

  block(error: Error, milliseconds = 60_000): void {
    this.failure = error;
    this.blockedUntil = Date.now() + milliseconds;
  }

  async run<T>(request: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    } else {
      this.active += 1;
    }
    try {
      const startAt = Math.max(Date.now(), this.nextStart);
      this.nextStart = startAt + this.intervalMs;
      const delay = startAt - Date.now();
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      // Check after taking a slot, so queued requests stop too.
      if (this.failure && Date.now() < this.blockedUntil) throw this.failure;
      return await request();
    } finally {
      const next = this.waiters.shift();
      if (next) next();
      else this.active -= 1;
    }
  }
}
