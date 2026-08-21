const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __nycRateLimit?: Map<string, RateLimitEntry>;
};

const rateLimitStore = globalStore.__nycRateLimit ?? new Map<string, RateLimitEntry>();
globalStore.__nycRateLimit = rateLimitStore;

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return { allowed: true };
}