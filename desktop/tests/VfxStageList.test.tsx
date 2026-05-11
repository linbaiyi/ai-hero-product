import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VfxStageList from "../src/components/VfxStageList";

describe("VfxStageList", () => {
  it("renders stage names and descriptions", () => {
    render(
      <VfxStageList
        stages={[
          {
            stage: "施法前摇",
            description: "角色手中聚集橙红色火焰。",
          },
        ]}
      />,
    );

    expect(screen.getByText("施法前摇")).toBeInTheDocument();
    expect(screen.getByText("角色手中聚集橙红色火焰。")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<VfxStageList stages={[]} />);

    expect(screen.getByText("暂无特效阶段")).toBeInTheDocument();
  });
});
