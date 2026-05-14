import { useRef } from "react";
import type { ProjectSummary } from "../types/project";
import ProjectHistoryItem from "./ProjectHistoryItem";

type ProjectHistoryPanelProps = {
  projects: ProjectSummary[];
  isLoading?: boolean;
  errorMessage?: string | null;
  activeProjectId?: string | null;
  onRefresh: () => void;
  onImport?: (file: File) => void;
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
};

function ProjectHistoryPanel({
  projects,
  isLoading = false,
  errorMessage = null,
  activeProjectId = null,
  onRefresh,
  onImport,
  onOpen,
  onDelete,
}: ProjectHistoryPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-2xl border border-slate-400/15 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="mb-3 h-1 w-10 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
          <h2 className="text-base font-semibold text-slate-50">历史项目</h2>
        </div>
        <div className="flex items-center gap-2">
          {onImport ? (
            <>
              <input
                accept=".zip,application/zip"
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) {
                    onImport(file);
                  }
                }}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="rounded-xl border border-slate-400/20 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-sky-300/35 hover:bg-slate-700/70"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                导入项目
              </button>
            </>
          ) : null}
          <button
            className="rounded-xl border border-slate-400/20 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-sky-300/35 hover:bg-slate-700/70"
            onClick={onRefresh}
            type="button"
          >
            刷新历史
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-slate-300">正在加载历史项目...</p>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">
          <p className="font-semibold">历史项目加载失败</p>
          <p className="mt-1">{errorMessage}</p>
          <button
            className="mt-3 rounded-xl border border-rose-300/30 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/10"
            onClick={onRefresh}
            type="button"
          >
            重新加载
          </button>
        </div>
      ) : null}

      {!isLoading && !errorMessage && projects.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">暂无历史项目</p>
      ) : null}

      {!isLoading && !errorMessage && projects.length > 0 ? (
        <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
          {projects.map((project) => (
            <ProjectHistoryItem
              isActive={project.project_id === activeProjectId}
              key={project.project_id}
              onDelete={onDelete}
              onOpen={onOpen}
              project={project}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ProjectHistoryPanel;
