import type { ReactNode } from "react";
import type {
  BoardRenderResult,
  ImageGenerationResult,
  ImagePromptResult,
  VfxDesign,
} from "../types/project";
import ErrorPanel from "./ErrorPanel";
import VfxBoardPreview from "./VfxBoardPreview";
import VfxBreakdownCard from "./VfxBreakdownCard";

type VfxBreakdownPanelProps = {
  vfxDesigns: VfxDesign[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  imagePrompts?: ImagePromptResult[];
  isImagePromptLoading?: boolean;
  imagePromptError?: string | null;
  onRetryImagePrompt?: () => void;
  imageResults?: ImageGenerationResult[];
  isImageGenerating?: boolean;
  imageGenerateError?: string | null;
  onRetryImages?: () => void;
  boardResult?: BoardRenderResult | null;
  isBoardRendering?: boolean;
  boardRenderError?: string | null;
  onRetryBoard?: () => void;
  headerAside?: ReactNode;
};

function VfxBreakdownPanel({
  vfxDesigns,
  isLoading = false,
  errorMessage = null,
  onRetry,
  imagePrompts = [],
  isImagePromptLoading = false,
  imagePromptError = null,
  onRetryImagePrompt,
  imageResults = [],
  isImageGenerating = false,
  imageGenerateError = null,
  onRetryImages,
  boardResult = null,
  isBoardRendering = false,
  boardRenderError = null,
  onRetryBoard,
  headerAside = null,
}: VfxBreakdownPanelProps) {
  if (isLoading) {
    return (
      <section className="flex h-full min-h-[520px] items-center justify-center rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-slate-500/25 border-t-sky-400 bg-sky-400/5" />
          <p className="text-lg font-semibold text-sky-100">
            正在拆解技能特效...
          </p>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <ErrorPanel
        message={errorMessage}
        onRetry={onRetry}
        retryLabel="重新拆解"
        title="特效拆解失败"
      />
    );
  }

  if (vfxDesigns.length === 0) {
    return (
      <VfxBoardPreview
        boardResult={boardResult}
        errorMessage={boardRenderError}
        isLoading={isBoardRendering}
        onRetry={onRetryBoard}
      />
    );
  }

  return (
    <section className="space-y-5">
      <VfxBoardPreview
        boardResult={boardResult}
        errorMessage={boardRenderError}
        isLoading={isBoardRendering}
        onRetry={onRetryBoard}
      />

      <div className="rounded-2xl border border-slate-400/15 bg-slate-900/75 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
          <div>
            <div className="mb-5 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
        <h2 className="text-xl font-semibold text-slate-50">
          技能特效拆解方案
        </h2>

          </div>
          {headerAside ? <div className="self-start">{headerAside}</div> : null}
        </div>

        {imagePromptError ? (
          <div className="mt-5">
            <ErrorPanel
              message={imagePromptError}
              onRetry={onRetryImagePrompt}
              retryLabel="重新生成 Prompt"
              title="图像 Prompt 生成失败"
            />
          </div>
        ) : null}

        {imageGenerateError ? (
          <div className="mt-5">
            <ErrorPanel
              message={imageGenerateError}
              onRetry={onRetryImages}
              retryLabel="重新生成图片"
              title="技能特效图片生成失败"
            />
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {vfxDesigns.map((vfx) => {
            const imagePrompt =
              imagePrompts.find(
                (prompt) => prompt.skill_name === vfx.skill_name,
              ) ?? null;
            const imageResult =
              imageResults.find(
                (result) => result.skill_name === vfx.skill_name,
              ) ?? null;

            return (
              <VfxBreakdownCard
                imagePrompt={imagePrompt}
                imageResult={imageResult}
                isImageGenerating={isImageGenerating}
                isImagePromptLoading={isImagePromptLoading}
                key={vfx.skill_name}
                vfx={vfx}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default VfxBreakdownPanel;
