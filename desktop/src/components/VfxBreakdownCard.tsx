import type {
  ImageGenerationResult,
  ImagePromptResult,
  VfxDesign,
} from "../types/project";
import ImagePromptBox from "./ImagePromptBox";
import VfxImagePreview from "./VfxImagePreview";
import VfxStageList from "./VfxStageList";

type VfxBreakdownCardProps = {
  vfx: VfxDesign;
  imagePrompt?: ImagePromptResult | null;
  isImagePromptLoading?: boolean;
  imageResult?: ImageGenerationResult | null;
  isImageGenerating?: boolean;
};

function VfxBreakdownCard({
  vfx,
  imagePrompt = null,
  isImagePromptLoading = false,
  imageResult = null,
  isImageGenerating = false,
}: VfxBreakdownCardProps) {
  return (
    <article className="rounded-2xl border border-slate-400/12 bg-slate-950/35 p-5 shadow-md shadow-black/15 transition hover:border-slate-300/20 hover:bg-slate-800/45">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="break-words text-xl font-semibold text-slate-50">
          {vfx.skill_name}
        </h3>
        <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200">
          {vfx.vfx_category}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {vfx.visual_keywords.map((keyword) => (
          <span
            className="rounded-full border border-slate-400/15 bg-slate-800/55 px-2.5 py-1 text-xs text-slate-300"
            key={keyword}
          >
            {keyword}
          </span>
        ))}
      </div>

      <div className="mt-5">
        <h4 className="mb-3 text-sm font-semibold text-slate-200">阶段拆解</h4>
        <VfxStageList stages={vfx.stages} />
      </div>

      <div className="mt-5">
        <h4 className="mb-3 text-sm font-semibold text-slate-200">色彩方案</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(vfx.color_palette).map(([name, value]) => (
            <div className="rounded-xl border border-slate-400/10 bg-slate-800/45 p-3" key={name}>
              <div
                aria-hidden="true"
                className="h-6 rounded border border-white/20"
                style={{ backgroundColor: value }}
              />
              <p className="mt-2 text-xs text-slate-500">{name}</p>
              <p className="mt-1 text-sm text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <InfoRow title="镜头建议" content={vfx.camera_suggestion} />
        <InfoRow title="声音建议" content={vfx.sound_suggestion} />
      </div>

      <div className="mt-5 border-t border-slate-400/10 pt-5">
        <ImagePromptBox
          imagePrompt={imagePrompt}
          isLoading={isImagePromptLoading}
        />
      </div>

      <div className="mt-5 border-t border-slate-400/10 pt-5">
        <VfxImagePreview
          imageResult={imageResult}
          isLoading={isImageGenerating}
        />
      </div>
    </article>
  );
}

function InfoRow({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-xl border border-slate-400/10 bg-slate-800/45 p-3">
      <p className="text-slate-500">{title}</p>
      <p className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-300">
        {content}
      </p>
    </div>
  );
}

export default VfxBreakdownCard;
