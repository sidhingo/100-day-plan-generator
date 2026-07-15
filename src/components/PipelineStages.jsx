const STAGES = [
  { key: 'researching', label: 'Researching', detail: 'Pulling recent news, funding, leadership, product signals' },
  { key: 'structuring', label: 'Structuring', detail: 'Mapping findings into quick wins, structural issues, a KPI tree' },
  { key: 'building', label: 'Building', detail: 'Assembling the one-pager' },
];

export default function PipelineStages({ status, company }) {
  const activeIndex = status === 'researching' ? 0 : status === 'structuring' ? 1 : 2;

  return (
    <div className="py-16">
      <p className="text-sm text-neutral-500 mb-8 font-mono">
        Building the plan for <span className="text-neutral-900 font-medium">{company}</span>...
      </p>
      <div className="space-y-6">
        {STAGES.map((stage, i) => {
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;
          return (
            <div key={stage.key} className="flex items-start gap-4">
              <div
                className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  isDone ? 'bg-neutral-900' : isActive ? 'bg-neutral-900 animate-pulse' : 'bg-neutral-200'
                }`}
              />
              <div>
                <p
                  className={`font-medium ${
                    isDone || isActive ? 'text-neutral-900' : 'text-neutral-300'
                  }`}
                >
                  {stage.label}
                  {isActive && '...'}
                </p>
                <p className={`text-sm ${isDone || isActive ? 'text-neutral-500' : 'text-neutral-300'}`}>
                  {stage.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
