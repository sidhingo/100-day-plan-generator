import { Ratelimit } from '@upstash/ratelimit';
import { redis, dayKey, keys } from '../lib/redis.js';
import { estimateCostCents, DAILY_BUDGET_CAP_CENTS } from '../lib/pricing.js';

export const config = { runtime: 'edge' };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// 5 requests per IP per rolling day, generous for a real visitor, a wall for a bot.
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 d'),
  prefix: 'ratelimit:ip',
});

function sse(obj) {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

async function verifyTurnstile(token, ip) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true; // allow local dev without a key configured
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

async function callAnthropic({ model, system, messages, tools, maxTokens }) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      ...(tools ? { tools } : {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errText.slice(0, 300)}`);
  }
  return res.json();
}

function countSearches(response) {
  return (response.content || []).filter((b) => b.type === 'server_tool_use' && b.name === 'web_search').length;
}

function extractText(response) {
  return (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const today = dayKey();

  const stream = new ReadableStream({
    async start(controller) {
      const fail = (message, status = 400) => {
        controller.enqueue(sse({ stage: 'error', message }));
        controller.close();
      };

      try {
        const { company, turnstileToken } = await req.json();

        if (!company || typeof company !== 'string' || company.length > 120) {
          return fail("That company name doesn't look right, try again.");
        }

        // 1. Turnstile check (invisible to real users)
        const human = await verifyTurnstile(turnstileToken, ip);
        if (!human) return fail('Verification failed, refresh the page and try again.');

        // 2. Per-IP rate limit
        const { success } = await ratelimit.limit(ip);
        if (!success) return fail("You've hit today's limit for this tool. Check back tomorrow.");

        // 3. Sitewide daily budget circuit-breaker
        const spentToday = Number((await redis.get(keys.dailyBudget(today))) || 0);
        if (spentToday >= DAILY_BUDGET_CAP_CENTS) {
          return fail("High demand right now, check back later today.");
        }

        // 4. Serve from cache if this exact company was already run today
        const slug = company.trim().toLowerCase().replace(/\s+/g, '-');
        const cached = await redis.get(keys.cache(slug));
        if (cached) {
          controller.enqueue(sse({ stage: 'research', status: 'start' }));
          controller.enqueue(sse({ stage: 'structuring', status: 'start' }));
          controller.enqueue(sse({ stage: 'complete', plan: cached }));
          controller.close();
          return;
        }

        // --- Stage 1: Research (Haiku + web search) ---
        controller.enqueue(sse({ stage: 'research', status: 'start' }));

        const researchResponse = await callAnthropic({
          model: 'claude-haiku-4-5-20251001',
          maxTokens: 1200,
          system:
            'You are a research assistant. Given a company name, use web search to find: recent news (last 6-12 months), funding status and investors, leadership team, core product/positioning, and any visible strategic signals (layoffs, expansion, new product lines, competitive pressure). Return a dense factual briefing, not prose commentary. If you cannot find enough public information, say so plainly.',
          messages: [{ role: 'user', content: `Research this company: ${company}` }],
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        });

        const researchBrief = extractText(researchResponse);
        const searchCount = countSearches(researchResponse);

        if (!researchBrief || researchBrief.length < 40) {
          return fail(`Couldn't find enough public information on "${company}" to build a plan.`);
        }

        // --- Stage 2: Structuring (Sonnet, JSON output) ---
        controller.enqueue(sse({ stage: 'structuring', status: 'start' }));

        const structuringResponse = await callAnthropic({
          model: 'claude-sonnet-5',
          maxTokens: 3000,
          system: `You are a senior strategy consultant building a 100-day plan from a research briefing. Respond with ONLY valid JSON, no preamble, no markdown fences, matching exactly this shape:
{
  "companyName": "the company's real, correctly capitalized brand name, taken from the research briefing itself, not from how the user typed it. Example: if the user typed 'anthropic' but the briefing refers to the company as Anthropic throughout, output 'Anthropic'. Match brand-specific casing exactly (eBay, iRobot, ByteDance).",
  "summary": "2-3 sentence framing of the situation and the plan's core thesis. Be concise.",
  "quickWins": ["...", "..."],
  "structuralIssues": ["...", "..."],
  "kpiTree": ["...", "..."],
  "phases": [
    {"name": "Days 1-30: Listen & Diagnose", "days": "1-30", "focus": "...", "actions": ["...", "..."]},
    {"name": "Days 31-60: ...", "days": "31-60", "focus": "...", "actions": ["...", "..."]},
    {"name": "Days 61-100: ...", "days": "61-100", "focus": "...", "actions": ["...", "..."]}
  ]
}
Keep quickWins and structuralIssues to exactly 4 items each. kpiTree must be exactly 4 items, and every item must be the same kind of thing: a single measurable metric or ratio (e.g. "net revenue retention," "compute utilization rate"), never a category label, a narrative sentence, or a mix of metric types. Each phase gets exactly 3 action items. Be concise throughout. Ground everything in the specific facts from the briefing. No generic consulting filler.`,
          messages: [{ role: 'user', content: `Research briefing on ${company}:\n\n${researchBrief}` }],
        });

        const structuringText = extractText(structuringResponse);
        let plan;
        try {
          let raw = structuringText.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
          try {
            plan = JSON.parse(raw);
          } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('no JSON object found');
            plan = JSON.parse(match[0]);
          }
        } catch {
          return fail('The plan came back incomplete. Please try again.');
        }

        // Safety net: if the model just echoed the raw input back uncapitalized,
        // apply a basic title-case fallback rather than showing it lowercase.
        if (!plan.companyName || plan.companyName === plan.companyName.toLowerCase()) {
          plan.companyName = company.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
        }

        // --- Cost tracking (fire-and-forget-ish, but await so counts are accurate) ---
        const researchCost = estimateCostCents({
          model: 'claude-haiku-4-5-20251001',
          inputTokens: researchResponse.usage?.input_tokens || 0,
          outputTokens: researchResponse.usage?.output_tokens || 0,
          searchCount,
        });
        const structuringCost = estimateCostCents({
          model: 'claude-sonnet-5',
          inputTokens: structuringResponse.usage?.input_tokens || 0,
          outputTokens: structuringResponse.usage?.output_tokens || 0,
        });
        const totalCostCents = researchCost + structuringCost;

        await Promise.all([
          redis.incrbyfloat(keys.dailyBudget(today), totalCostCents),
          redis.incrbyfloat(keys.statsCostCents(today), totalCostCents),
          redis.incr(keys.statsHits(today)),
          redis.sadd(keys.statsIps(today), ip),
          redis.set(keys.cache(slug), plan, { ex: 60 * 60 * 24 * 7 }), // cache 7 days
        ]);

        controller.enqueue(sse({ stage: 'complete', plan }));
        controller.close();
      } catch (err) {
        controller.enqueue(sse({ stage: 'error', message: 'Something went wrong generating the plan. Try again.' }));
        controller.close();
        console.error('generate.js error:', err);
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
