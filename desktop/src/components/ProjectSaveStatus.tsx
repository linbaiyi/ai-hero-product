import type { ProjectSaveStatusType } from "../types/project";

type ProjectSaveStatusProps = {
  status: ProjectSaveStatusType;
  errorMessage?: string | null;
  savedAt?: string | null;
  onRetry?: () => void;
};

function ProjectSaveStatus({
  status,
  errorMessage = null,
  savedAt = null,
  onRetry,
}: ProjectSaveStatusProps) {
  const baseClass =
    "rounded-2xl border bg-slate-900/70 p-4 text-sm shadow-lg shadow-black/20 backdrop-blur";

  if (status === "saving") {
    return (
      <section className={`${baseClass} border-sky-300/20 text-sky-200`}>
        <p className="font-semibold">正在保存项目...</p>
      </section>
    );
  }

  if (status === "saved") {
    return (
      <section className={`${baseClass} border-emerald-300/20 text-emerald-300`}>
        <p className="font-semibold">项目已保存</p>
        {savedAt ? <p className="mt-1 text-xs text-slate-400">{savedAt}</p> : null}
      </section>
    );
  }

  if (status === "failed") {
    return (
      <section className={`${baseClass} border-rose-400/25 text-rose-200`}>
        <p className="font-semibold">项目保存失败</p>
        {errorMessage ? (
          <p className="mt-1 leading-5 text-rose-200/85">{errorMessage}</p>
        ) : null}
        {onRetry ? (
          <button
            className="mt-3 rounded-xl border border-rose-300/30 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/10"
            onClick={onRetry}
            type="button"
          >
            重新保存
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className={`${baseClass} border-slate-400/15 text-slate-400`}>
      <p className="font-semibold">项目尚未保存</p>
    </section>
  );
}

export default ProjectSaveStatus;
