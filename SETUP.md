# Setup & Operations Guide

Technical setup steps for running and deploying the 100-Day Plan Generator. See `README.md`
for the project overview.

## What it costs

- ~$0.06/run at current pricing (~$0.07 after Sonnet 5's intro pricing ends Aug 31, 2026)
- Circuit-breaker caps: $1/day (in `lib/pricing.js`), $25/month (set as a hard limit in the
  Anthropic Console, not just in code, since code caps can fail if Redis is down and the
  Console cap can't)
- 5 requests per IP per day, invisible Cloudflare Turnstile check, daily response cache per company

## One-time setup (do this before deploying)

### 1. Anthropic API key and spend cap
1. Go to [console.anthropic.com](https://console.anthropic.com), then **API Keys**
2. Create a **new, dedicated key** for this project. Don't reuse a key from other work,
   so this project's spend cap doesn't accidentally throttle something else
3. Go to **Settings > Limits** (or **Billing**) and set a **hard monthly spend limit of $25**
   on this key or workspace. This is the real insurance; everything else in this app is a
   nice-to-have on top of it
4. Copy the key into `ANTHROPIC_API_KEY`

### 2. Upstash Redis (rate limiting and stats storage, free tier)
1. Go to [upstash.com](https://upstash.com), sign up, then **Create Database**
2. Type: Redis, choose a region close to your Vercel deployment region
3. On the database page, copy the **REST URL** and **REST TOKEN** into
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 3. Cloudflare Turnstile (invisible bot check, free)
1. Go to [dash.cloudflare.com/?to=/:account/turnstile](https://dash.cloudflare.com/?to=/:account/turnstile),
   sign up if needed, then **Add Site**
2. Domain: your Vercel domain (add the `.vercel.app` one now, add a custom domain later if you add one)
3. Widget mode: **Invisible**
4. Copy the **Site Key** into `VITE_TURNSTILE_SITE_KEY` and the **Secret Key** into `TURNSTILE_SECRET_KEY`

### 4. Resend (weekly report emails, free tier, 3,000/mo)
1. Go to [resend.com](https://resend.com), sign up (no credit card needed for free tier)
2. **API Keys**, then Create API Key, then copy into `RESEND_API_KEY`
3. **Domains**, then Add Domain, and follow the DNS verification steps for a domain you own
   (this lets you send from e.g. `reports@yourdomain.com` instead of a generic address).
   If you don't want to verify a domain right now, Resend's free tier lets you send from
   `onboarding@resend.dev` to your own verified account email as a shortcut, fine for a
   personal weekly report, just less polished. Set `REPORT_FROM_EMAIL` accordingly
4. Set `REPORT_TO_EMAIL` to whatever inbox you want the weekly report to land in

### 5. Cron secret
Generate any random string (e.g. `openssl rand -hex 16` in a terminal) and set it as
`CRON_SECRET`. This stops random internet traffic from hitting your report endpoint
and triggering emails.

## Deploy

```bash
npm install
```

Push this to a GitHub repo, then in Vercel:
1. **New Project**, then import the repo
2. Add every variable from `.env.example` under **Settings > Environment Variables**
3. Deploy

The weekly cron (`vercel.json`) is picked up automatically on deploy, no extra config needed
in the Vercel dashboard. It fires every **Monday 00:00 UTC**, which lands **Sunday evening US
Eastern** (roughly 7-8pm depending on daylight saving). If your timing preference drifts
noticeably, adjust the cron string in `vercel.json`.

## Local development

```bash
cp .env.example .env
# fill in the values
npm run dev
```

Note: the Anthropic calls happen in `/api` serverless functions, which `vite dev` doesn't run
by itself. Use `vercel dev` instead (`npm i -g vercel`, then `vercel dev`) to run frontend and
API routes together locally.

## Updating pricing

`lib/pricing.js` has Sonnet 5's rate hardcoded with a note for when intro pricing ends
Aug 31, 2026. Swap the commented line in on Sept 1, otherwise the cost tracking (and the
weekly email) will under-report actual spend by roughly 30%.

## Files that matter most if you're extending this

- `api/generate.js`: the whole pipeline. Rate limit, budget check, cache check, research
  (Haiku plus web search), structuring (Sonnet, JSON), cost tracking, cache write
- `lib/pricing.js`: cost model and circuit-breaker thresholds, all in one place
- `api/cron/weekly-report.js`: the Sunday email
