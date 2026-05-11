import type { ImagePromptResult } from "../types/project";
import ImagePromptBox from "./ImagePromptBox";

type ImagePromptPanelProps = {
  imagePrompts: ImagePromptResult[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

function ImagePromptPanel({
  imagePrompts,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: ImagePromptPanelProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20">
        <p className="animate-pulse text-lg font-semibold text-sky-100">
          正在生成全部技能图像 Prompt...
        </p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-6">
        <h3 className="text-lg font-semibold text-rose-100">
          图像 Prompt 生成失败
        </h3>
        <p className="mt-3 break-words text-sm leading-6 text-rose-100/80">
          {errorMessage}
        </p>
        {onRetry ? (
          <button
            className="mt-4 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/10"
            type="button"
            onClick={onRetry}
          >
            重新生成 Prompt
          </button>
        ) : null}
      </section>
    );
  }

  if (imagePrompts.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-500/30 bg-slate-950/35 p-6 text-sm text-slate-400">
        暂无图像 Prompt
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20">
      <h3 className="text-xl font-semibold text-slate-50">图像 Prompt 列表</h3>
      <div className="mt-4 space-y-4">
        {imagePrompts.map((imagePrompt) => (
          <ImagePromptBox
            imagePrompt={imagePrompt}
            key={imagePrompt.skill_name}
          />
        ))}
      </div>
    </section>
  );
}

export default ImagePromptPanel;


