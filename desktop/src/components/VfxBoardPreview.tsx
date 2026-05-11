import { buildBackendFileUrl } from "../api/fileUrl";
import type { BoardRenderResult } from "../types/project";

type VfxBoardPreviewProps = {
  boardResult?: BoardRenderResult | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

function VfxBoardPreview({
  boardResult = null,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: VfxBoardPreviewProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20">
        <p className="animate-pulse text-lg font-semibold text-sky-100">
          正在生成技能特效设计板...
        </p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-6 shadow-lg shadow-black/20">
        <h2 className="text-xl font-semibold text-rose-100">
          技能特效设计板生成失败
        </h2>
        <p className="mt-3 break-words text-sm leading-6 text-rose-100/80">
          {errorMessage}
        </p>
        {onRetry ? (
          <button
            className="mt-4 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/10"
            onClick={onRetry}
            type="button"
          >
            重新生成设计板
          </button>
        ) : null}
      </section>
    );
  }

  if (!boardResult) {
    return (
      <section className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20">
        <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
        <h2 className="text-xl font-semibold text-slate-50">
          技能特效设计板区
        </h2>
        <p className="mt-4 leading-7 text-slate-300">
          预留技能镜头、粒子特效、色彩氛围和设计板预览。
        </p>
      </section>
    );
  }

  if (!boardResult.success) {
    return (
      <section className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-6 shadow-lg shadow-black/20">
        <h2 className="text-xl font-semibold text-rose-100">设计板生成失败</h2>
        <p className="mt-3 break-words text-sm leading-6 text-rose-100/80">
          {boardResult.error_message ?? "未知错误"}
        </p>
      </section>
    );
  }

  const boardUrl = buildBackendFileUrl(boardResult.board_path);

  const handleOpen = () => {
    window.open(boardUrl, "_blank");
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = boardUrl;
    link.download = boardResult.file_name || "vfx_board.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20">
      <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-50">
          最终技能特效设计板
        </h2>
        <span className="text-sm text-slate-400">
          {boardResult.width}×{boardResult.height}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-400/15 bg-slate-950/65">
        <img
          alt="最终技能特效设计板"
          className="block max-h-[720px] w-full max-w-full object-contain"
          src={boardUrl}
        />
      </div>

      <p className="mt-3 break-words text-xs text-slate-400">
        {boardResult.file_name}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-xl border border-slate-400/20 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-300/35 hover:bg-slate-700/70"
          onClick={handleOpen}
          type="button"
        >
          打开设计板
        </button>
        <button
          className="rounded-xl border border-slate-400/20 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-300/35 hover:bg-slate-700/70"
          onClick={handleDownload}
          type="button"
        >
          下载设计板
        </button>
      </div>
    </section>
  );
}

export default VfxBoardPreview;
