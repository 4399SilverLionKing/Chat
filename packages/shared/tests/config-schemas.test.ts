import { describe, expect, it } from "vitest";

import { parseAppConfig } from "../src/config/schemas.js";

describe("parseAppConfig", () => {
  it("parses valid config content", () => {
    const config = parseAppConfig({
      storage: {
        profile_dir: "./data/profiles",
        save_sanitized_chat: false,
        sanitized_chat_dir: "./data/sanitized",
      },
      weflow: {
        base_url: "http://127.0.0.1:8080",
        timeout_seconds: 30,
        token: "",
        wxid: "wxid_1",
        wechat_id: "",
        messages: {
          page_size: 200,
          max_pages: 10,
          start: "",
          end: "",
        },
      },
    });

    expect(config.weflow.wxid).toBe("wxid_1");
    expect(config.weflow.wechatId).toBeNull();
  });
});
