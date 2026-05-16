import { describe, expect, it } from "vitest";
import { buildBackendFileUrl } from "../src/api/fileUrl";

describe("buildBackendFileUrl", () => {
  it("builds backend file URL for output image path", () => {
    const url = buildBackendFileUrl("outputs/images/a.png");

    expect(url).toBe("http://127.0.0.1:8001/api/files/outputs/images/a.png");
  });

  it("encodes Chinese paths", () => {
    const url = buildBackendFileUrl("outputs/images/demo/skill_烈焰冲击.png");

    expect(url).toContain(
      "/api/files/outputs/images/demo/skill_%E7%83%88%E7%84%B0%E5%86%B2%E5%87%BB.png",
    );
  });

  it("returns http URL as-is", () => {
    const url = "https://example.com/image.png";

    expect(buildBackendFileUrl(url)).toBe(url);
  });

  it("returns empty string for empty path", () => {
    expect(buildBackendFileUrl("")).toBe("");
  });
});
