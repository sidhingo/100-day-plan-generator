// Per-million-token rates in USD. Update if Anthropic changes pricing;
// check https://www.anthropic.com/pricing before assuming these are still current.
export const RATES = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-5': { input: 2.0, output: 10.0 }, // intro pricing through Aug 31, 2026
  // 'claude-sonnet-5': { input: 3.0, output: 15.0 }, // standard pricing, swap after Aug 31, 2026
};

export const WEB_SEARCH_COST_CENTS = 1; // $0.01 per search

// Daily and monthly circuit-breaker caps, in cents. Keep these in sync with
// the Anthropic Console spend limit set on this project's dedicated API key.
export const DAILY_BUDGET_CAP_CENTS = 100; // $1.00/day
export const MONTHLY_BUDGET_CAP_CENTS = 2500; // $25.00/month, informational; hard stop lives in the Console

export function estimateCostCents({ model, inputTokens, outputTokens, searchCount = 0 }) {
  const rate = RATES[model];
  if (!rate) throw new Error(`Unknown model for pricing: ${model}`);
  const inputCost = (inputTokens / 1_000_000) * rate.input * 100;
  const outputCost = (outputTokens / 1_000_000) * rate.output * 100;
  const searchCost = searchCount * WEB_SEARCH_COST_CENTS;
  return inputCost + outputCost + searchCost;
}
