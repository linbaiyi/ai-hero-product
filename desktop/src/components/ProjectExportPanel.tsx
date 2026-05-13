import { useState, type ChangeEvent } from "react";
import type {
  ExportProjectRequest,
  ExportProjectResult,
  ProjectExportStatusType,
} from "../types/project";

type ProjectExportPanelProps = {
  projectId?: string | null;
  hasPlayableSpec?: boolean;
  hasRuntimeVfxAssetSpec?: boolean;
  status: ProjectExportStatusType;
  errorMessage?: string | null;
  exportResult?: ExportProjectResult | null;
  onExport: (options: ExportProjectRequest) => void;
  onDownload: () => void;
  onGoToPlayableSpec?: () => void;
};

const defaultOptions: ExportProjectRequest = {
  include_json: true,
  include_markdown: true,
  include_images: true,
  include_board: true,
  include_playable: true,
  include_runtime_vfx: false,
};

function ProjectExportPanel({
  projectId = null,
  hasPlayableSpec = false,
  hasRuntimeVfxAssetSpec = false,
  status,
  errorMessage = null,
  exportResult = null,
  onExport,
  onDownload,
  onGoToPlayableSpec,
}: ProjectExportPanelProps) {
  const [options, setOptions] = useState<ExportProjectRequest>(defaultOptions);
  const disabled = !projectId || status === "exporting";
  const submitLabel = status === "failed" ? "重新导出" : "导出资料包";

  const handleOptionChange =
    (key: keyof ExportProjectRequest) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setOptions((current) => ({
        ...current,
        [key]: event.target.checked,
      }));
    };

  return (
    <section className="rounded-2xl border border-slate-400/15 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <div className="mb-4 h-1 w-10 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
      <h2 className="text-base font-semibold text-slate-50">项目资料包导出</h2>

      {!projectId ? (
        <p className="mt-3 text-sm text-slate-400">暂无可导出的项目</p>
      ) : null}

      {projectId && status === "idle" ? (
        <p className="mt-3 text-sm text-emerald-300">项目可导出</p>
      ) : null}

      {status === "exporting" ? (
        <p className="mt-3 text-sm text-sky-200">正在导出项目资料包...</p>
      ) : null}

      {status === "exported" ? (
        <div className="mt-3 text-sm text-emerald-300">
          <p className="font-semibold">项目资料包已生成</p>
          {exportResult?.file_name ? (
            <p className="mt-1 break-all text-slate-400">
              {exportResult.file_name}
            </p>
          ) : null}
          {options.include_playable ? (
            <PlayableExportSuccess hasPlayableSpec={hasPlayableSpec} />
          ) : null}
          {options.include_runtime_vfx ? (
            <RuntimeVfxExportSuccess
              hasRuntimeVfxAssetSpec={hasRuntimeVfxAssetSpec}
            />
          ) : null}
        </div>
      ) : null}

      {status === "failed" ? (
        <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
          <p className="font-semibold">项目导出失败</p>
          {errorMessage ? <p className="mt-1">{errorMessage}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 text-sm text-slate-300">
        <ExportOption
          checked={options.include_json}
          label="包含 project.json"
          onChange={handleOptionChange("include_json")}
        />
        <ExportOption
          checked={options.include_markdown}
          label="包含 Markdown 文档"
          onChange={handleOptionChange("include_markdown")}
        />
        <ExportOption
          checked={options.include_images}
          label="包含技能图"
          onChange={handleOptionChange("include_images")}
        />
        <ExportOption
          checked={options.include_board}
          label="包含设计板"
          onChange={handleOptionChange("include_board")}
        />
        <ExportOption
          checked={Boolean(options.include_playable)}
          label="包含 playable_spec"
          onChange={handleOptionChange("include_playable")}
        />
        {projectId && options.include_playable ? (
          <PlayableExportHint
            hasPlayableSpec={hasPlayableSpec}
            onGoToPlayableSpec={onGoToPlayableSpec}
          />
        ) : null}
        <ExportOption
          checked={Boolean(options.include_runtime_vfx)}
          label="包含运行时贴图资产"
          onChange={handleOptionChange("include_runtime_vfx")}
        />
        {projectId && options.include_runtime_vfx ? (
          <RuntimeVfxExportHint
            hasRuntimeVfxAssetSpec={hasRuntimeVfxAssetSpec}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "exported" ? (
          <button
            className="rounded-xl border border-slate-400/20 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-sky-300/35 hover:bg-slate-700/70"
            onClick={onDownload}
            type="button"
          >
            下载 ZIP
          </button>
        ) : (
          <button
            className="rounded-xl border border-sky-300/20 bg-gradient-to-r from-violet-500 to-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-violet-400 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onClick={() => onExport(options)}
            type="button"
          >
            {submitLabel}
          </button>
        )}
      </div>
    </section>
  );
}

function RuntimeVfxExportHint({
  hasRuntimeVfxAssetSpec,
}: {
  hasRuntimeVfxAssetSpec: boolean;
}) {
  if (hasRuntimeVfxAssetSpec) {
    return (
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
        <p className="font-semibold">运行时贴图资产已就绪</p>
        <p className="mt-2 text-cyan-100/90">导出包将包含：</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-cyan-100/80">
          <li>playable/runtime_vfx/README.md</li>
          <li>playable/runtime_vfx/runtime_vfx_asset_spec.json</li>
          <li>playable/runtime_vfx/textures/</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
      <p className="font-semibold">尚未生成运行时贴图资产</p>
      <p className="mt-2">
        当前项目尚未生成 runtime_vfx_asset_spec，导出包不会包含运行时贴图配置和 textures。
      </p>
    </div>
  );
}

function RuntimeVfxExportSuccess({
  hasRuntimeVfxAssetSpec,
}: {
  hasRuntimeVfxAssetSpec: boolean;
}) {
  if (hasRuntimeVfxAssetSpec) {
    return (
      <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
        <p className="font-semibold">已包含运行时贴图资产</p>
        <p className="mt-1">可在 ZIP 的 playable/runtime_vfx/ 目录查看。</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
      <p className="font-semibold">当前项目尚未生成 runtime_vfx_asset_spec</p>
      <p className="mt-1">导出包不会包含运行时贴图配置和 textures。</p>
    </div>
  );
}

type PlayableExportHintProps = {
  hasPlayableSpec: boolean;
  onGoToPlayableSpec?: () => void;
};

function PlayableExportHint({
  hasPlayableSpec,
  onGoToPlayableSpec,
}: PlayableExportHintProps) {
  if (hasPlayableSpec) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
        <p className="font-semibold">可试玩配置已就绪</p>
        <p className="mt-2 text-emerald-100/90">导出包将包含：</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-emerald-100/80">
          <li>playable/README.md</li>
          <li>playable/hero_playable_spec.json</li>
          <li>playable/default_training_map.json</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
      <p className="font-semibold">尚未生成试玩配置</p>
      <p className="mt-2">
        导出包将包含 playable/README.md 和 default_training_map.json，但不会包含
        hero_playable_spec.json。
      </p>
      <p className="mt-1 text-amber-100/80">
        请前往 Blueprint 页面点击“生成试玩配置”。
      </p>
      {onGoToPlayableSpec ? (
        <button
          className="mt-3 rounded border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-300/20"
          onClick={onGoToPlayableSpec}
          type="button"
        >
          前往生成试玩配置
        </button>
      ) : null}
    </div>
  );
}

function PlayableExportSuccess({
  hasPlayableSpec,
}: {
  hasPlayableSpec: boolean;
}) {
  if (hasPlayableSpec) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
        <p className="font-semibold">已包含可试玩配置</p>
        <p className="mt-1">已包含默认训练场，可在 ZIP 的 playable/ 目录查看。</p>
        <p className="mt-1 text-emerald-200/80">
          playable/hero_playable_spec.json
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
      <p className="font-semibold">已包含 playable 说明和默认训练场</p>
      <p className="mt-1">当前项目尚未生成 hero_playable_spec.json。</p>
    </div>
  );
}

type ExportOptionProps = {
  checked: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function ExportOption({ checked, label, onChange }: ExportOptionProps) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-500/15 bg-slate-950/30 px-3 py-2">
      <input
        checked={checked}
        className="h-4 w-4 accent-violet-500"
        onChange={onChange}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

export default ProjectExportPanel;
