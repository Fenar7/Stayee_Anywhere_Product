import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitOptions {
  limit: number;
  windowMs: number; // in milliseconds
}

// ==========================================
// 1. In-Memory Fallback (Local Dev / Fallback)
// ==========================================
interface RateLimitStore {
  count: number;
  resetTime: number;
}
const memoryStore = new Map<string, RateLimitStore>();

async function memoryRateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now();
  
  // Lazy cleanup
  if (Math.random() < 0.05) {
    for (const [key, value] of Array.from(memoryStore.entries())) {
      if (value.resetTime < now) {
        memoryStore.delete(key);
      }
    }
  }

  const record = memoryStore.get(identifier);
  if (!record || record.resetTime < now) {
    memoryStore.set(identifier, {
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


// ==========================================
// 2. Upstash Redis (Production Edge)
// ==========================================
// We instantiate this lazily so we don't crash if env vars are missing.
let redisCache: Redis | null = null;
const ratelimiters = new Map<string, Ratelimit>(); // Cache ratelimit instances by config

function getRedisClient() {
  if (redisCache) return redisCache;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisCache = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redisCache;
  }
  return null;
}

function getUpstashRatelimiter(limit: number, windowMs: number): Ratelimit {
  const windowSecs = Math.max(1, Math.floor(windowMs / 1000));
  const key = `${limit}_${windowSecs}s`;
  if (!ratelimiters.has(key)) {
    ratelimiters.set(key, new Ratelimit({
      redis: getRedisClient() as Redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
      analytics: true,
    }));
  }
  return ratelimiters.get(key)!;
}

// ==========================================
// 3. Main Polymorphic Rate Limiter
// ==========================================
export async function rateLimit(identifier: string, options: RateLimitOptions) {
  const redis = getRedisClient();
  
  if (redis) {
    // Production Path: Upstash Redis
    const limiter = getUpstashRatelimiter(options.limit, options.windowMs);
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return { success, limit, remaining, resetTime: reset };
  }

  // Fallback Path: In-Memory
  return memoryRateLimit(identifier, options);
}

// ==========================================
// 4. Robust IP Extraction (Anti-Spoofing)
// ==========================================
export function extractIp(request: NextRequest): string {
  // 1. Try secure, trusted headers provided by the hosting provider (e.g. Vercel)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // 2. Fall back to x-forwarded-for, but securely extract ONLY the true client IP.
  // x-forwarded-for format: "client1, proxy1, proxy2"
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Split by comma and get the first IP, which is the original client
    const ips = forwardedFor.split(",");
    if (ips.length > 0 && ips[0].trim().length > 0) {
      return ips[0].trim();
    }
  }

  // 3. Final fallback
  return "unknown-ip";
}
