import type { HeroDesign } from "../types/project";
import SkillCard from "./SkillCard";

type HeroResultPanelProps = {
  hero: HeroDesign | null;
  isLoading?: boolean;
};

function HeroResultPanel({ hero, isLoading = false }: HeroResultPanelProps) {
  if (isLoading) {
    return (
      <section className="flex h-full min-h-[520px] items-center justify-center rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-slate-500/25 border-t-sky-400 bg-sky-400/5" />
          <p className="text-lg font-semibold text-sky-100">
            正在生成英雄技能方案...
          </p>
        </div>
      </section>
    );
  }

  if (!hero) {
    return (
      <section className="flex h-full min-h-[520px] flex-col justify-between rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div>
          <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
          <h2 className="text-xl font-semibold text-slate-50">
            英雄技能方案区
          </h2>
          <p className="mt-4 leading-7 text-slate-300">
            预留被动、主动技能、终极技能与玩法循环的生成结果。
          </p>
        </div>
        <div className="mt-8 rounded-2xl border border-dashed border-slate-500/35 bg-slate-950/35 p-5 text-sm text-slate-500">
          提交左侧需求后生成英雄方案
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
      <p className="text-sm text-slate-400">{hero.hero_title}</p>
      <h2 className="mt-2 break-words text-3xl font-semibold tracking-[-0.02em] text-slate-50">
        {hero.hero_name}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200">
          {hero.role}
        </span>
        <span className="rounded-full border border-slate-400/15 bg-slate-800/55 px-2.5 py-1 text-xs text-slate-300">
          难度 {hero.difficulty}/5
        </span>
        {hero.core_tags.map((tag) => (
          <span
            className="rounded-full border border-slate-400/15 bg-slate-800/55 px-2.5 py-1 text-xs text-slate-300"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>

      <InfoBlock title="背景故事" content={hero.background} />
      <InfoBlock title="战斗风格" content={hero.combat_style} />

      <div className="mt-6 space-y-4">
        {hero.skills.map((skill) => (
          <SkillCard key={`${skill.slot}-${skill.name}`} skill={skill} />
        ))}
      </div>

      <InfoBlock title="连招逻辑" content={hero.combo_logic} />
      <InfoBlock title="克制关系" content={hero.counterplay} />
      <InfoBlock title="平衡性总结" content={hero.balance_summary} />
    </section>
  );
}

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-400/10 bg-slate-950/35 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-slate-300">
        {content}
      </p>
    </div>
  );
}

export default HeroResultPanel;
