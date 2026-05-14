import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectHistoryPanel from "../src/components/ProjectHistoryPanel";
import { projectSummary } from "./projectTestData";

describe("ProjectHistoryPanel", () => {
  it("shows loading state", () => {
    render(
      <ProjectHistoryPanel
        isLoading
        onDelete={vi.fn()}
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
        projects={[]}
      />,
    );
    expect(screen.getByText("正在加载历史项目...")).toBeInTheDocument();
  });

  it("shows error state and refresh button", () => {
    const onRefresh = vi.fn();
    render(
      <ProjectHistoryPanel
        errorMessage="历史项目加载失败，请稍后重试。"
        onDelete={vi.fn()}
        onOpen={vi.fn()}
        onRefresh={onRefresh}
        projects={[]}
      />,
    );

    expect(screen.getByText("历史项目加载失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows empty state", () => {
    render(
      <ProjectHistoryPanel
        onDelete={vi.fn()}
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
        projects={[]}
      />,
    );
    expect(screen.getByText("暂无历史项目")).toBeInTheDocument();
  });

  it("shows projects and forwards actions", () => {
    const onRefresh = vi.fn();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProjectHistoryPanel
        onDelete={onDelete}
        onOpen={onOpen}
        onRefresh={onRefresh}
        projects={[projectSummary]}
      />,
    );

    expect(screen.getByText("焚烬法皇")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "刷新历史" }));
    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith("desktop_123");
    expect(onDelete).toHaveBeenCalledWith("desktop_123");
  });

  it("imports a selected zip file", () => {
    const onImport = vi.fn();
    render(
      <ProjectHistoryPanel
        onDelete={vi.fn()}
        onImport={onImport}
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
        projects={[]}
      />,
    );
    const file = new File(["zip"], "project.zip", { type: "application/zip" });

    fireEvent.click(screen.getByRole("button", { name: "导入项目" }));
    fireEvent.change(document.querySelector("input[type='file']") as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(onImport).toHaveBeenCalledWith(file);
  });
});
