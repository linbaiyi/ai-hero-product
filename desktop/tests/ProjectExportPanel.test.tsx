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

    expect(screen.getByText("暂无可导出的项目")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出资料包" })).toBeDisabled();
  });

  it("shows idle state with all options checked", () => {
    render(
      <ProjectExportPanel
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="idle"
      />,
    );

    expect(screen.getByText("项目可导出")).toBeInTheDocument();
    expect(screen.getByLabelText("包含 project.json")).toBeChecked();
    expect(screen.getByLabelText("包含 Markdown 文档")).toBeChecked();
    expect(screen.getByLabelText("包含技能图")).toBeChecked();
    expect(screen.getByLabelText("包含设计板")).toBeChecked();
    expect(screen.getByLabelText("包含 playable_spec")).toBeChecked();
  });

  it("calls onExport with selected options including include_playable", () => {
    const onExport = vi.fn();
    render(
      <ProjectExportPanel
        onDownload={vi.fn()}
        onExport={onExport}
        projectId="desktop_123"
        status="idle"
      />,
    );

    fireEvent.click(screen.getByLabelText("包含技能图"));
    fireEvent.click(screen.getByRole("button", { name: "导出资料包" }));

    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        include_json: true,
        include_markdown: true,
        include_images: false,
        include_board: true,
        include_playable: true,
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

    expect(screen.getByText("可试玩配置已就绪")).toBeInTheDocument();
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

    expect(screen.getByText("尚未生成试玩配置")).toBeInTheDocument();
    expect(
      screen.getByText(/但不会包含\s*hero_playable_spec\.json/),
    ).toBeInTheDocument();
  });

  it("can navigate to Blueprint generation hint", () => {
    const onGoToPlayableSpec = vi.fn();
    render(
      <ProjectExportPanel
        hasPlayableSpec={false}
        onDownload={vi.fn()}
        onExport={vi.fn()}
        onGoToPlayableSpec={onGoToPlayableSpec}
        projectId="desktop_123"
        status="idle"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "前往生成试玩配置" }));

    expect(onGoToPlayableSpec).toHaveBeenCalledTimes(1);
  });

  it("does not show playable completion summary when include_playable is false", () => {
    const { rerender } = render(
      <ProjectExportPanel
        hasPlayableSpec
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="idle"
      />,
    );

    fireEvent.click(screen.getByLabelText("包含 playable_spec"));
    rerender(
      <ProjectExportPanel
        exportResult={exportResult}
        hasPlayableSpec
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="exported"
      />,
    );

    expect(screen.getByText("项目资料包已生成")).toBeInTheDocument();
    expect(screen.queryByText("已包含可试玩配置")).not.toBeInTheDocument();
  });

  it("shows playable success summary when include_playable is true and hasPlayableSpec is true", () => {
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

    expect(screen.getByText("已包含可试玩配置")).toBeInTheDocument();
    expect(screen.getAllByText("playable/hero_playable_spec.json").length).toBeGreaterThan(0);
  });

  it("does not claim hero_playable_spec.json is included when hasPlayableSpec is false", () => {
    render(
      <ProjectExportPanel
        exportResult={exportResult}
        hasPlayableSpec={false}
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="exported"
      />,
    );

    expect(screen.getByText("已包含 playable 说明和默认训练场")).toBeInTheDocument();
    expect(screen.queryByText("已包含可试玩配置")).not.toBeInTheDocument();
  });

  it("shows exporting state", () => {
    render(
      <ProjectExportPanel
        onDownload={vi.fn()}
        onExport={vi.fn()}
        projectId="desktop_123"
        status="exporting"
      />,
    );

    expect(screen.getByText("正在导出项目资料包...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出资料包" })).toBeDisabled();
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

    expect(screen.getByText("项目资料包已生成")).toBeInTheDocument();
    expect(screen.getByText("desktop_123_export.zip")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下载 ZIP" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("shows failed state and retries", () => {
    const onExport = vi.fn();
    render(
      <ProjectExportPanel
        errorMessage="项目导出失败，请稍后重试。"
        onDownload={vi.fn()}
        onExport={onExport}
        projectId="desktop_123"
        status="failed"
      />,
    );

    expect(screen.getByText("项目导出失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新导出" }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
