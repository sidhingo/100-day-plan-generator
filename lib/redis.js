import { Redis } from '@upstash/redis';

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env automatically
export const redis = Redis.fromEnv();

// --- Key helpers -----------------------------------------------------------
// All stats are stored per UTC day so the weekly cron can sum the last 7 days
// without needing a separate "reset" step that could race with live traffic.

export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10); // YYYY-MM-DD

export const keys = {
  ipCount: (ip, day) => `ratelimit:ip:${ip}:${day}`,
  dailyBudget: (day) => `budget:day:${day}`,
  statsHits: (day) => `stats:hits:${day}`,
  statsCostCents: (day) => `stats:cost_cents:${day}`,
  statsIps: (day) => `stats:ips:${day}`, // a Set, for rough unique-visitor count
  cache: (companySlug) => `cache:${companySlug}`,
};
