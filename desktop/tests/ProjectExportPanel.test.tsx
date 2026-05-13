import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectExportPanel from "../src/components/ProjectExportPanel";

const exportResult = {
  project_id: "desktop_123",
  export_path: "outputs/exports/desktop_123/desktop_123_export.zip",
  file_name: "desktop_123_export.zip",
  success: true,
  error_message: null,
};

describe("ProjectExportPanel", () => {
  it("shows disabled state without projectId", () => {
    render(
      <ProjectExportPanel
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId={null}
        status="idle"
      />,
    );

    expect(screen.getByText(/暂无|鏆傛棤/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /导出|瀵煎嚭/ })).toBeDisabled();
  });

  it("shows default export options", () => {
    render(
      <ProjectExportPanel
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="idle"
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(6);
    expect(
      checkboxes
        .slice(0, 5)
        .every((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toBe(true);
    expect(checkboxes[5]).not.toBeChecked();
  });

  it("calls onExport with selected options including include_runtime_vfx", () => {
    const onExport = vi.fn();
    render(
      <ProjectExportPanel
        onDownload={vi.fn()}
        onExport={onExport}
        projectId="desktop_123"
        status="idle"
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[2]);
    fireEvent.click(checkboxes[5]);
    fireEvent.click(screen.getByRole("button", { name: /导出|瀵煎嚭/ }));

    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        include_json: true,
        include_markdown: true,
        include_images: false,
        include_board: true,
        include_playable: true,
        include_runtime_vfx: true,
      }),
    );
  });

  it("shows hero_playable_spec.json when hasPlayableSpec is true", () => {
    render(
      <ProjectExportPanel
        hasPlayableSpec
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="idle"
      />,
    );

    expect(screen.getByText("playable/hero_playable_spec.json")).toBeInTheDocument();
    expect(screen.getByText("playable/default_training_map.json")).toBeInTheDocument();
  });

  it("shows missing playable spec hint when hasPlayableSpec is false", () => {
    render(
      <ProjectExportPanel
        hasPlayableSpec={false}
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="idle"
      />,
    );

    expect(screen.getByText(/hero_playable_spec\.json/)).toBeInTheDocument();
  });

  it("shows runtime vfx hint when selected without generated assets", () => {
    render(
      <ProjectExportPanel
        hasRuntimeVfxAssetSpec={false}
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="idle"
      />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[5]);

    expect(screen.getByText(/runtime_vfx_asset_spec/)).toBeInTheDocument();
  });

  it("shows runtime vfx ready hint when selected with generated assets", () => {
    render(
      <ProjectExportPanel
        hasRuntimeVfxAssetSpec
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="idle"
      />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[5]);

    expect(
      screen.getByText("playable/runtime_vfx/runtime_vfx_asset_spec.json"),
    ).toBeInTheDocument();
  });

  it("does not show playable completion summary when include_playable is false", () => {
    render(
      <ProjectExportPanel
        exportResult={exportResult}
        hasPlayableSpec
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="exported"
      />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[4]);

    expect(screen.queryByText(/已包含可试玩配置|宸插寘鍚/)).not.toBeInTheDocument();
  });

  it("shows exported state and downloads", () => {
    const onDownload = vi.fn();
    render(
      <ProjectExportPanel
        exportResult={exportResult}
        onDownload={onDownload}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="exported"
      />,
    );

    expect(screen.getByText("desktop_123_export.zip")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /下载|涓嬭浇/ }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("shows failed state and retries", () => {
    const onExport = vi.fn();
    render(
      <ProjectExportPanel
        errorMessage="export failed"
        onDownload={vi.fn()}
        onExport={onExport}
        projectId="desktop_123"
        status="failed"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /重新|閲嶆柊/ }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
