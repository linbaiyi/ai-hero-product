import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectSaveStatus from "../src/components/ProjectSaveStatus";

describe("ProjectSaveStatus", () => {
  it("shows idle state", () => {
    render(<ProjectSaveStatus status="idle" />);
    expect(screen.getByText("项目尚未保存")).toBeInTheDocument();
  });

  it("shows saving state", () => {
    render(<ProjectSaveStatus status="saving" />);
    expect(screen.getByText("正在保存项目...")).toBeInTheDocument();
  });

  it("shows saved state", () => {
    render(<ProjectSaveStatus savedAt="2026-05-08" status="saved" />);
    expect(screen.getByText("项目已保存")).toBeInTheDocument();
    expect(screen.getByText(/2026-05-08/)).toBeInTheDocument();
  });

  it("shows failed state and retries", () => {
    const onRetry = vi.fn();
    render(
      <ProjectSaveStatus
        errorMessage="磁盘写入失败"
        onRetry={onRetry}
        status="failed"
      />,
    );

    expect(screen.getByText("项目保存失败")).toBeInTheDocument();
    expect(screen.getByText("磁盘写入失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新保存" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
