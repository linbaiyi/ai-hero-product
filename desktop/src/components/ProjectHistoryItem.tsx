import type { ProjectSummary } from "../types/project";

type ProjectHistoryItemProps = {
  project: ProjectSummary;
  isActive?: boolean;
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
};

function ProjectHistoryItem({
  project,
  isActive = false,
  onOpen,
  onDelete,
}: ProjectHistoryItemProps) {
  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        isActive
          ? "border-sky-300/35 bg-sky-400/10"
          : "border-slate-400/12 bg-slate-950/30 hover:border-slate-300/20 hover:bg-slate-800/45"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-50">
            {project.hero_name}
          </h3>
          {project.hero_title ? (
            <p className="mt-1 text-xs text-slate-400">{project.hero_title}</p>
          ) : null}
        </div>
        {project.board_path ? (
          <span className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-200">
            含设计板
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {project.role ? <Badge>{project.role}</Badge> : null}
        {project.element_theme ? <Badge>{project.element_theme}</Badge> : null}
        {project.art_style ? <Badge>{project.art_style}</Badge> : null}
      </div>

      <p className="mt-3 break-words text-xs text-slate-500">
        更新于 {project.updated_at}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          className="rounded-xl border border-slate-400/20 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-sky-300/35 hover:bg-slate-700/70"
          onClick={() => onOpen(project.project_id)}
          type="button"
        >
          打开
        </button>
        <button
          className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10"
          onClick={() => onDelete(project.project_id)}
          type="button"
        >
          删除
        </button>
      </div>
    </article>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-400/15 bg-slate-800/55 px-2 py-1 text-slate-300">
      {children}
    </span>
  );
}

export default ProjectHistoryItem;
