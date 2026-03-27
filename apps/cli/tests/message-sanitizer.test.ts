import { describe, expect, it } from "vitest";

import { SanitizationError } from "@chat-tools/shared";

import { sanitizeMessages } from "../src/features/shared/message-sanitizer.js";

describe("sanitizeMessages", () => {
  it("keeps only speaker and text", () => {
    const result = sanitizeMessages([
      { speaker: "我", text: "你好" },
      { speaker: "对方", text: "在吗" },
    ]);

    expect(result).toBe("我：你好\n对方：在吗");
  });

  it("ignores blank text", () => {
    const result = sanitizeMessages([
      { speaker: "我", text: " " },
      { speaker: "对方", text: " 在 " },
    ]);

    expect(result).toBe("对方：在");
  });

  it("raises when everything is filtered", () => {
    expect(() =>
      sanitizeMessages([{ speaker: "我", text: " " }]),
    ).toThrow(SanitizationError);
  });
});
