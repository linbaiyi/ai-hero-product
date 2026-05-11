import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectHistoryItem from "../src/components/ProjectHistoryItem";
import { projectSummary } from "./projectTestData";

describe("ProjectHistoryItem", () => {
  it("shows project summary fields", () => {
    render(
      <ProjectHistoryItem
        onDelete={vi.fn()}
        onOpen={vi.fn()}
        project={projectSummary}
      />,
    );

    expect(screen.getByText("焚烬法皇")).toBeInTheDocument();
    expect(screen.getByText("法师")).toBeInTheDocument();
    expect(screen.getByText("火焰")).toBeInTheDocument();
    expect(screen.getByText("暗黑奇幻")).toBeInTheDocument();
    expect(screen.getByText("含设计板")).toBeInTheDocument();
  });

  it("calls open and delete handlers", () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProjectHistoryItem
        onDelete={onDelete}
        onOpen={onOpen}
        project={projectSummary}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    expect(onOpen).toHaveBeenCalledWith("desktop_123");
    expect(onDelete).toHaveBeenCalledWith("desktop_123");
  });
});
