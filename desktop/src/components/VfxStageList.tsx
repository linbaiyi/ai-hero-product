import type { VfxStage } from "../types/project";

type VfxStageListProps = {
  stages: VfxStage[];
};

function VfxStageList({ stages }: VfxStageListProps) {
  if (stages.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-500/30 bg-slate-950/35 p-4 text-sm text-slate-500">
        暂无特效阶段
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {stages.map((stage, index) => (
        <li
          className="rounded-2xl border border-slate-400/10 bg-slate-950/35 p-4"
          key={`${stage.stage}-${index}`}
        >
          <p className="text-sm font-semibold text-slate-200">{stage.stage}</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
            {stage.description}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default VfxStageList;


