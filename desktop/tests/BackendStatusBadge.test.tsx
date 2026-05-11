import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BackendStatusBadge from "../src/components/BackendStatusBadge";

describe("BackendStatusBadge", () => {
  it("renders idle status", () => {
    render(<BackendStatusBadge status="idle" />);

    expect(screen.getByText("后端未检测")).toBeInTheDocument();
  });

  it("renders checking status", () => {
    render(<BackendStatusBadge status="checking" />);

    expect(screen.getByText("正在检测后端...")).toBeInTheDocument();
  });

  it("renders connected status", () => {
    render(<BackendStatusBadge status="connected" />);

    expect(screen.getByText("后端已连接")).toBeInTheDocument();
  });

  it("renders connected status with version", () => {
    render(<BackendStatusBadge status="connected" version="0.1.0" />);

    expect(screen.getByText("后端已连接 v0.1.0")).toBeInTheDocument();
  });

  it("renders failed status", () => {
    render(<BackendStatusBadge status="failed" />);

    expect(screen.getByText("后端连接失败")).toBeInTheDocument();
  });

  it("renders retry button and calls onRetry", () => {
    const onRetry = vi.fn();
    render(<BackendStatusBadge status="failed" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "重试连接" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
