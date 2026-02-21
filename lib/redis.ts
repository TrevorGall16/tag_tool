import { Redis } from "@upstash/redis";

/**
 * Singleton Upstash Redis client shared by rate-limiting and auth helpers.
 * Returns null when env vars are absent (local dev without Redis).
 */
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;
