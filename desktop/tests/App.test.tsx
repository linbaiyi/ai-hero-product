import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App";

describe("App", () => {
  it("renders the home page shell", () => {
    render(<App />);

    expect(screen.getByText("AI 游戏英雄设计助手")).toBeInTheDocument();
  });
});
