import type { SkillDesign } from "../types/project";

type SkillCardProps = {
  skill: SkillDesign;
};

function SkillCard({ skill }: SkillCardProps) {
  return (
    <article className="rounded-2xl border border-slate-400/12 bg-slate-950/35 p-4 shadow-md shadow-black/15 transition hover:border-slate-300/20 hover:bg-slate-800/45">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-200">
          {skill.slot}
        </span>
        <span className="rounded-full border border-slate-400/15 bg-slate-800/55 px-2.5 py-1 text-xs text-slate-300">
          {skill.type}
        </span>
      </div>

      <h4 className="mt-3 text-xl font-semibold text-slate-50">
        {skill.name}
      </h4>
      <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">
        {skill.description}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {skill.mechanics}
      </p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-slate-400/10 bg-slate-800/45 p-2">
          <dt className="text-slate-500">冷却</dt>
          <dd className="mt-1 text-slate-200">{skill.cooldown}</dd>
        </div>
        <div className="rounded-xl border border-slate-400/10 bg-slate-800/45 p-2">
          <dt className="text-slate-500">消耗</dt>
          <dd className="mt-1 text-slate-200">{skill.cost}</dd>
        </div>
        <div className="rounded-xl border border-slate-400/10 bg-slate-800/45 p-2">
          <dt className="text-slate-500">伤害类型</dt>
          <dd className="mt-1 text-slate-200">{skill.damage_type}</dd>
        </div>
      </dl>

      <p className="mt-4 whitespace-pre-wrap border-t border-slate-700/60 pt-3 text-sm leading-6 text-slate-400">
        {skill.balance_notes}
      </p>
    </article>
  );
}

export default SkillCard;
