export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitStore>();

export function rateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now();
  
  // Lazy cleanup: occasionally remove expired keys to prevent unbounded memory growth
  if (Math.random() < 0.05) {
    for (const [key, value] of Array.from(store.entries())) {
      if (value.resetTime < now) {
        store.delete(key);
      }
    }
  }

  const record = store.get(identifier);

  if (!record || record.resetTime < now) {
    store.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return { success: true, limit: options.limit, remaining: options.limit - 1, resetTime: now + options.windowMs };
  }

  if (record.count >= options.limit) {
    return { success: false, limit: options.limit, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { success: true, limit: options.limit, remaining: options.limit - record.count, resetTime: record.resetTime };
}
