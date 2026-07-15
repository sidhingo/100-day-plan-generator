import { exportPlanToPdf } from '../lib/pdfExport.js';

export default function PlanOutput({ plan, company, onReset }) {
  const displayName = plan.companyName || company;
  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500 font-mono">
            100-Day Plan
          </p>
          <h2 className="text-2xl font-semibold">{displayName}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportPlanToPdf(plan, displayName)}
            className="border border-neutral-300 px-4 py-2 rounded text-sm font-medium hover:border-neutral-900 transition-colors"
          >
            Export PDF
          </button>
          <button
            onClick={onReset}
            className="text-neutral-500 px-4 py-2 rounded text-sm font-medium hover:text-neutral-900 transition-colors"
          >
            New plan
          </button>
        </div>
      </div>

      {plan.summary && (
        <p className="text-neutral-700 leading-relaxed mb-10 border-l-2 border-neutral-900 pl-4">
          {plan.summary}
        </p>
      )}

      <Section title="Quick Wins (First 30 Days)" items={plan.quickWins} />
      <Section title="Structural Issues to Address" items={plan.structuralIssues} />
      <Section title="KPI Tree" items={plan.kpiTree} />

      {plan.phases && plan.phases.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm uppercase tracking-widest text-neutral-500 font-mono mb-4">
            Phased Roadmap
          </h3>
          <div className="space-y-6">
            {plan.phases.map((phase, i) => (
              <div key={i} className="border border-neutral-200 rounded p-5">
                <p className="font-medium mb-1">
                  {phase.name} <span className="text-neutral-400 font-mono text-sm">({phase.days})</span>
                </p>
                <p className="text-sm text-neutral-600 mb-3">{phase.focus}</p>
                {phase.actions && (
                  <ul className="text-sm text-neutral-700 space-y-1.5">
                    {phase.actions.map((a, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-neutral-400 mt-1.5 flex-shrink-0">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10">
      <h3 className="text-sm uppercase tracking-widest text-neutral-500 font-mono mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-neutral-700 leading-relaxed flex gap-3">
            <span className="text-neutral-300 font-mono text-sm mt-1">{String(i + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
