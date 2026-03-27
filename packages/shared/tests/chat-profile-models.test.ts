import { describe, expect, it } from "vitest";

import { ContactIdentifier, normalizeMessageText } from "../src/chat-profile/models.js";

describe("ContactIdentifier", () => {
  it("prefers wxid over wechat id", () => {
    const identifier = new ContactIdentifier({ wxid: "wxid_1", wechatId: "alice" });

    expect(identifier.preferredType).toBe("wxid");
    expect(identifier.preferredValue).toBe("wxid_1");
  });

  it("falls back to wechat id", () => {
    const identifier = new ContactIdentifier({ wechatId: "alice" });

    expect(identifier.preferredType).toBe("wechat_id");
    expect(identifier.preferredValue).toBe("alice");
  });
});

describe("normalizeMessageText", () => {
  it("trims message content", () => {
    expect(normalizeMessageText(" 你好 ")).toBe("你好");
  });
});
