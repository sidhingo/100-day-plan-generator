# 100-Day Plan Generator

A live AI pipeline, not a template. Type any company name and it researches that company on
the open web in real time, then runs a structured reasoning pass to build a 100-day plan in
front of you.

**Live demo:** [[100-Day Plan Generator](https://hundred-day-plan.vercel.app/)]

## Why this exists

This was built as a proof of concept for how I use AI in practice, not just how I talk about
it. The output, while relevant, is less impressive than watching it unfold: real web research, 
a real reasoning pass, running as a production system with rate
limiting, cost controls, and monitoring, not as a one-off script.

## How it works

Two stages, both real Anthropic API calls, not a canned templated response:

1. **Research**: an AI research pass with live web search decides on its own what to look up:
   recent news, funding, leadership, product positioning, and competitive signals
2. **Structuring**: a second pass takes that research and builds a structured plan with quick
   wins, structural issues, a KPI tree, and a phased roadmap

Production guardrails: per-IP rate limiting, an invisible bot check, a daily spend
circuit-breaker, and response caching, so it can sit on a public link without an open-ended
API bill.

## Stack

React, Vite, Tailwind CSS on the frontend. Vercel serverless functions as the orchestrator.
Anthropic API (Claude) for research and reasoning. Upstash Redis for rate limiting and usage
tracking. Cloudflare Turnstile for bot protection. Resend for automated reporting.

## Setup

See [`SETUP.md`](./SETUP.md) for the full technical walkthrough, including account setup for
every service this depends on.

Built by [sidhingo](https://github.com/sidhingo).
