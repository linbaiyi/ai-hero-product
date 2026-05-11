import { buildBackendFileUrl } from "../api/fileUrl";
import type { ImageGenerationResult } from "../types/project";

type VfxImagePreviewProps = {
  imageResult?: ImageGenerationResult | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

function VfxImagePreview({
  imageResult = null,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: VfxImagePreviewProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-400/15 bg-slate-950/35 p-4">
        <p className="animate-pulse text-sm font-semibold text-sky-100">
          正在生成技能特效图...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4">
        <h4 className="text-sm font-semibold text-rose-100">
          技能特效图生成失败
        </h4>
        <p className="mt-2 break-words text-sm leading-6 text-rose-100/80">
          {errorMessage}
        </p>
        {onRetry ? (
          <button
            className="mt-3 rounded-xl border border-rose-300/30 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/10"
            type="button"
            onClick={onRetry}
          >
            重新生成图片
          </button>
        ) : null}
      </div>
    );
  }

  if (!imageResult) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-500/30 bg-slate-950/35 p-4 text-sm text-slate-400">
        暂无技能特效图
      </div>
    );
  }

  if (!imageResult.success) {
    return (
      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4">
        <h4 className="text-sm font-semibold text-rose-100">
          该技能图片生成失败
        </h4>
        <p className="mt-2 break-words text-sm leading-6 text-rose-100/75">
          {imageResult.error_message ?? "未知错误"}
        </p>
      </div>
    );
  }

  const imageUrl = buildBackendFileUrl(imageResult.image_path);

  return (
    <div className="rounded-2xl border border-slate-400/15 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-200">
          技能特效预览图
        </h4>
        <span className="text-xs text-slate-400">
          {imageResult.width}×{imageResult.height}
        </span>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-400/15 bg-slate-950/65">
        <img
          alt={`${imageResult.skill_name} 技能特效预览图`}
          className="block max-h-[360px] w-full max-w-full object-contain"
          src={imageUrl}
        />
      </div>
      <p className="mt-3 break-words text-xs text-slate-400">
        {imageResult.file_name}
      </p>
    </div>
  );
}

export default VfxImagePreview;


