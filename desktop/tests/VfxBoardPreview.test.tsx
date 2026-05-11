import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VfxBoardPreview from "../src/components/VfxBoardPreview";
import type { BoardRenderResult } from "../src/types/project";

const boardResult: BoardRenderResult = {
  project_id: "desktop_123",
  board_path: "outputs/boards/desktop_123/vfx_board.png",
  file_name: "vfx_board.png",
  width: 1600,
  height: 2400,
  success: true,
  error_message: null,
};

describe("VfxBoardPreview", () => {
  it("renders placeholder state", () => {
    render(<VfxBoardPreview />);

    expect(screen.getByText("技能特效设计板区")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<VfxBoardPreview isLoading />);

    expect(screen.getByText("正在生成技能特效设计板...")).toBeInTheDocument();
  });

  it("renders error state with retry", () => {
    const onRetry = vi.fn();
    render(
      <VfxBoardPreview
        errorMessage="技能特效设计板生成失败，请稍后重试。"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("技能特效设计板生成失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成设计板" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders successful board result", () => {
    render(<VfxBoardPreview boardResult={boardResult} />);

    const image = screen.getByRole("img", { name: "最终技能特效设计板" });
    expect(screen.getByText("最终技能特效设计板")).toBeInTheDocument();
    expect(image).toHaveAttribute(
      "src",
      "http://127.0.0.1:8000/api/files/outputs/boards/desktop_123/vfx_board.png",
    );
    expect(screen.getByText("vfx_board.png")).toBeInTheDocument();
    expect(screen.getByText("1600×2400")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开设计板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载设计板" })).toBeInTheDocument();
  });

  it("renders failed board result", () => {
    render(
      <VfxBoardPreview
        boardResult={{
          ...boardResult,
          success: false,
          error_message: "renderer failed",
        }}
      />,
    );

    expect(screen.getByText("设计板生成失败")).toBeInTheDocument();
    expect(screen.getByText("renderer failed")).toBeInTheDocument();
  });
});
