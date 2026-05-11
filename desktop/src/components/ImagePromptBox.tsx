import type { ImagePromptResult } from "../types/project";

type ImagePromptBoxProps = {
  imagePrompt: ImagePromptResult | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

function ImagePromptBox({
  imagePrompt,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: ImagePromptBoxProps) {
  const handleCopy = async () => {
    if (!imagePrompt?.prompt || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(imagePrompt.prompt);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-400/15 bg-slate-950/35 p-4">
        <p className="animate-pulse text-sm font-semibold text-sky-100">
          正在生成图像 Prompt...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4">
        <h4 className="text-sm font-semibold text-rose-100">
          图像 Prompt 生成失败
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
            重新生成 Prompt
          </button>
        ) : null}
      </div>
    );
  }

  if (!imagePrompt) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-500/30 bg-slate-950/35 p-4 text-sm text-slate-400">
        暂无图像 Prompt
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-400/15 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">
            图像生成 Prompt
          </h4>
          <p className="mt-1 text-xs text-slate-400">{imagePrompt.skill_name}</p>
        </div>
        <button
          className="rounded-xl border border-slate-400/20 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-sky-300/35 hover:bg-slate-700/70"
          type="button"
          onClick={() => void handleCopy()}
        >
          复制 Prompt
        </button>
      </div>

      <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-slate-500/25 bg-slate-950/70 p-3 font-mono text-xs leading-6 text-slate-200">
        {imagePrompt.prompt}
      </pre>

      {imagePrompt.negative_prompt ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-400">反向 Prompt</p>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-500/20 bg-slate-950/50 p-3 font-mono text-xs leading-6 text-slate-400">
            {imagePrompt.negative_prompt}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export default ImagePromptBox;


