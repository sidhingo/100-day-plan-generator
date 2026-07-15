export default function CompanyInput({ company, setCompany, onGenerate, errorMsg }) {
  return (
    <div className="py-12">
      <h2 className="text-2xl font-semibold mb-3">Watch this build your 100-day plan, live.</h2>
            <p className="text-neutral-600 mb-5 leading-relaxed">
        Type any company name below. It runs a real pipeline: live web research, then a
        structured reasoning pass, to build a 100-day plan in front of you, not from a
        template. It's a small proof of how I build and operate AI tools, not a claim that
        the plan itself replaces your own strategic judgment.
      </p>

      <div className="flex gap-3">
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onGenerate()}
          placeholder="e.g. Anthropic, Google, your own company..."
          className="flex-1 border border-neutral-300 rounded px-4 py-3 text-base focus:outline-none focus:border-neutral-900"
        />
        <button
          onClick={onGenerate}
          disabled={!company.trim()}
          className="bg-neutral-900 text-white px-6 py-3 rounded font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
        >
          Generate
        </button>
      </div>

      {errorMsg && (
        <p className="mt-4 text-sm text-red-600 font-mono">{errorMsg}</p>
      )}

      <p className="mt-4 text-xs text-neutral-400 font-mono">
        Takes about 20-30 seconds. Output based on live web research.
      </p>

      <details className="mt-6 text-xs text-neutral-500">
        <summary className="cursor-pointer font-mono uppercase tracking-widest hover:text-neutral-900">
          How this works
        </summary>
        <p className="mt-2 leading-relaxed font-sans text-[13px]">
          Two-stage pipeline: a research pass with live web search decides what to look up on
          its own (news, funding, leadership, product signals), then a structuring pass turns
          that into the plan you see. In production behind rate limiting, per-IP throttling,
          a daily spend circuit-breaker, and response caching, built to run unattended on a
          public link without an open-ended API bill.
        </p>
      </details>
    </div>
  );
}
