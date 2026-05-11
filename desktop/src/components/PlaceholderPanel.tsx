type PlaceholderPanelProps = {
  title: string;
  description: string;
};

function PlaceholderPanel({ title, description }: PlaceholderPanelProps) {
  return (
    <article className="flex h-full min-h-[520px] flex-col justify-between rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div>
        <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
        <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
        <p className="mt-4 leading-7 text-slate-300">{description}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-500/30 bg-slate-950/35 p-5 text-sm text-slate-400">
        后续阶段接入功能模块
      </div>
    </article>
  );
}

export default PlaceholderPanel;


